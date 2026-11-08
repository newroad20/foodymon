-- 푸디몬 v14 — 식사 '많이 먹었어'
-- 먹은 끼니로 똑같이 센다 (양으로 점수를 바꾸지 않는다). 아래 함수는 먹은 끼니 목록에 'much'만 더했다.

alter table public.meal_records drop constraint if exists meal_records_status_check;
alter table public.meal_records add constraint meal_records_status_check
  check (status in ('ate','much','little','hard','skipped','no_answer'));

create or replace function public.goal_points(p_uid uuid, p_day date, p_areas integer)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  g        public.small_goals%rowtype;
  first_d  date;
  base     integer;
  today_n  integer;
  t_bed    time;
  b_bed    time;
  earlier  integer;
begin
  select min(d) into first_d from (
    select min(log_date) d from public.sleep_records where user_id = p_uid
    union all select min(log_date) from public.meal_records where user_id = p_uid
    union all select min(log_date) from public.mind_records where user_id = p_uid) f;
  select * into g from public.small_goals where user_id = p_uid and log_date = p_day;

  if (p_day - coalesce(first_d, p_day)) < public.observe_days() or not found or g.held then
    return case when p_areas >= 2 then 20 when p_areas = 1 then 10 else 0 end;
  end if;

  if g.kind = 'more_meal' then
    select count(*) filter (where status in ('ate','much','little','hard')) into base
      from public.meal_records where user_id = p_uid and log_date = p_day - 1;
    select count(*) filter (where status in ('ate','much','little','hard')) into today_n
      from public.meal_records where user_id = p_uid and log_date = p_day;
    if today_n >= base + g.size then return 20; end if;
    if today_n >= base and today_n > 0 then return 10; end if;
    if exists (select 1 from public.meal_records where user_id = p_uid and log_date = p_day) then return 5; end if;
    return 0;
  elsif g.kind = 'earlier_bed' then
    select bed_time into t_bed from public.sleep_records where user_id = p_uid and log_date = p_day;
    select bed_time into b_bed from public.sleep_records where user_id = p_uid and log_date = p_day - 1;
    if t_bed is null then return 0; end if;
    if b_bed is null then return 5; end if;
    earlier := public.night_minutes(b_bed) - public.night_minutes(t_bed);
    if earlier >= g.size then return 20; end if;
    if earlier * 2 >= g.size then return 10; end if;
    return 5;
  else -- mind_reason
    return coalesce((select max(case when situation is not null and note <> '' then 20
                                      when situation is not null or note <> '' then 10 else 5 end)
                       from public.mind_records where user_id = p_uid and log_date = p_day), 0);
  end if;
end; $$;

create or replace function public.day_points(p_uid uuid, p_day date)
returns table (sleep integer, meal integer, mind integer, goal integer, total integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  by_year smallint;
  age     integer;
  m       integer;
  eaten   integer;
  areas   integer := 0;
  bed     time;
  bed_n   integer;
  start_n integer;
  end_n   integer;
  dist    integer;
  min_m   integer;
  max_m   integer;
begin
  select birth_year into by_year from public.profiles where id = p_uid;
  age := extract(year from p_day)::integer - coalesce(by_year, 0);

  select minutes, bed_time into m, bed
    from public.sleep_records where user_id = p_uid and log_date = p_day;
  sleep := 0;
  if m is not null then
    areas := areas + 1;
    if by_year is not null and age <= 12 then
      min_m := 540; max_m := 720; start_n := 60; end_n := 180;   -- 19:00~21:00
    elsif by_year is not null and age <= 18 then
      min_m := 480; max_m := 600; start_n := 180; end_n := 240;  -- 21:00~22:00
    else
      min_m := 420; max_m := 540; start_n := 240; end_n := 300;  -- 22:00~23:00
    end if;

    sleep := case when m > max_m then 24 when m >= min_m then 30
                  when m >= min_m - 60 then 24 when m >= min_m - 120 then 18 else 10 end;

    -- 새 정책 시행일 이후만 취침 시각을 반영해 기존 누적점이 소급 감소하지 않게 한다.
    if p_day >= date '2026-10-30' and bed is not null then
      bed_n := public.night_minutes(bed);
      if not (bed_n between start_n and end_n) then
        dist := least(abs(bed_n - start_n), 1440 - abs(bed_n - start_n),
                      abs(bed_n - end_n), 1440 - abs(bed_n - end_n));
        if dist > 120 then sleep := least(sleep, 18);
        else sleep := least(sleep, 24);
        end if;
      end if;
    end if;
  end if;

  select count(*) filter (where status in ('ate','much','little','hard')), count(*)
    into eaten, m
    from public.meal_records where user_id = p_uid and log_date = p_day;
  meal := (array[0,10,20,28,34,38,40])[least(eaten, 6) + 1];
  if m > 0 then areas := areas + 1; end if;

  select coalesce(max(case when emotion <> 'no_answer' and (situation is not null or note <> '')
                           then 10 else 5 end), 0)
    into mind
    from public.mind_records where user_id = p_uid and log_date = p_day;
  if mind > 0 then areas := areas + 1; end if;

  goal := public.goal_points(p_uid, p_day, areas);
  total := least(100, sleep + meal + mind + goal);
  return next;
end; $$;

create or replace function public.get_small_goal(p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  first_d      date;
  g            public.small_goals%rowtype;
  y_eaten      integer;
  y_sleep      integer;
  y_bed        time;
  pts          record;
  target_n     integer;
  by_year      smallint;
  age          integer;
  min_m        integer;
  max_m        integer;
  start_n      integer;
  end_n        integer;
  bed_n        integer;
  bedtime_ok   boolean := false;
  sleep_ok     boolean := false;
  needs_prompt boolean := false;
  suggestion   text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select target_meals, birth_year into target_n, by_year from public.profiles where id = uid;
  age := extract(year from p_today)::integer - coalesce(by_year, 0);
  if by_year is not null and age <= 12 then
    min_m := 540; max_m := 720; start_n := 60; end_n := 180;
  elsif by_year is not null and age <= 18 then
    min_m := 480; max_m := 600; start_n := 180; end_n := 240;
  else
    min_m := 420; max_m := 540; start_n := 240; end_n := 300;
  end if;

  select min(d) into first_d from (
    select min(log_date) d from public.sleep_records where user_id = uid
    union all select min(log_date) from public.meal_records where user_id = uid
    union all select min(log_date) from public.mind_records where user_id = uid) f;
  select * into g from public.small_goals where user_id = uid and log_date = p_today;
  select count(*) filter (where status in ('ate','much','little','hard')) into y_eaten
    from public.meal_records where user_id = uid and log_date = p_today - 1;
  select minutes, bed_time into y_sleep, y_bed
    from public.sleep_records where user_id = uid and log_date = p_today - 1;

  if y_bed is not null then
    bed_n := public.night_minutes(y_bed);
    bedtime_ok := bed_n between start_n and end_n;
  end if;
  sleep_ok := y_sleep is not null and y_sleep between min_m and max_m and bedtime_ok;
  needs_prompt := y_eaten < greatest(target_n, 1) or not sleep_ok;
  suggestion := case when y_eaten < greatest(target_n, 1) then 'more_meal'
                     when not sleep_ok then 'earlier_bed'
                     else 'mind_reason' end;
  select * into pts from public.day_points(uid, p_today);

  return jsonb_build_object(
    'day',         (p_today - coalesce(first_d, p_today)) + 1,
    'observing',   (p_today - coalesce(first_d, p_today)) < public.observe_days(),
    'goal',        case when g.kind is null then null
                        else jsonb_build_object('kind', g.kind, 'size', g.size, 'held', g.held) end,
    'yesterday',   jsonb_build_object('eaten', y_eaten, 'bed_time', to_char(y_bed, 'HH24:MI'),
                                      'sleep_minutes', y_sleep, 'bedtime_ok', bedtime_ok),
    'target_meals', greatest(target_n, 1),
    'recommended_bed_start', to_char((time '18:00' + start_n * interval '1 minute')::time, 'HH24:MI'),
    'recommended_bed_end', to_char((time '18:00' + end_n * interval '1 minute')::time, 'HH24:MI'),
    'needs_prompt', needs_prompt,
    'suggestion',  suggestion,
    'points',      pts.goal
  );
end; $$;

create or replace function public.get_journey()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  j_start date;
  lo      date;
  hi      date;
  first_d date;
  days    integer;
  total   integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select journey_start into j_start from public.profiles where id = uid;
  lo := coalesce(j_start, date '0001-01-01');
  hi := coalesce(j_start + 99, date '9999-12-31');
  select min(d) into first_d from (
    select min(log_date) d from public.sleep_records where user_id = uid and log_date between lo and hi
    union all select min(log_date) from public.meal_records where user_id = uid and log_date between lo and hi
    union all select min(log_date) from public.mind_records where user_id = uid and log_date between lo and hi) f;
  select count(*) into days from (
    select log_date from public.sleep_records where user_id = uid and log_date between lo and hi
    union select log_date from public.meal_records where user_id = uid and log_date between lo and hi
    union select log_date from public.mind_records where user_id = uid and log_date between lo and hi) d;
  select coalesce(sum(dp.total), 0) into total
    from (select log_date from public.sleep_records where user_id = uid and log_date between lo and hi
          union select log_date from public.meal_records where user_id = uid and log_date between lo and hi
          union select log_date from public.mind_records where user_id = uid and log_date between lo and hi) d,
         lateral public.day_points(uid, d.log_date) dp;

  return jsonb_build_object(
    'first_date',    first_d,
    'recorded_days', days,
    'total',         total,
    'level',         (select evolution_stage from public.profiles where id = uid),
    'sleep_count',   (select count(*) from public.sleep_records where user_id = uid and log_date between lo and hi),
    'meal_count',    (select count(*) from public.meal_records
                       where user_id = uid and log_date between lo and hi and status in ('ate','much','little','hard')),
    'mind_count',    (select count(*) from public.mind_records where user_id = uid and log_date between lo and hi),
    'goals_done',    (select count(*) from public.small_goals s
                       where s.user_id = uid and s.log_date between lo and hi and not s.held
                         and public.goal_points(uid, s.log_date, 0) = 20),
    'reflection',    (select reflection from public.profiles where id = uid)
  );
end; $$;
