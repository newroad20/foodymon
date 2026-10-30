-- 푸디몬 v11 — 하루 일기장, 목표 미달 다음 날 제안, 취침 시각을 포함한 수면 성장점
-- 기존 날짜의 누적 성장점은 2026-10-30 이전 규칙을 유지한다.

create table if not exists public.daily_reflections (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null default current_date,
  text       text not null default '' check (char_length(text) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

drop trigger if exists daily_reflections_set_updated_at on public.daily_reflections;
create trigger daily_reflections_set_updated_at
  before update on public.daily_reflections
  for each row execute function public.set_updated_at();

alter table public.daily_reflections enable row level security;
drop policy if exists "daily_reflections_own" on public.daily_reflections;
create policy "daily_reflections_own" on public.daily_reflections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.daily_reflections from anon, authenticated;
grant select, insert, update, delete on public.daily_reflections to authenticated;

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

  select count(*) filter (where status in ('ate','little','hard')), count(*)
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
  select count(*) filter (where status in ('ate','little','hard')) into y_eaten
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

revoke all on function public.day_points(uuid, date) from public, anon, authenticated;
revoke all on function public.get_small_goal(date) from public, anon;
grant execute on function public.get_small_goal(date) to authenticated;

comment on table public.daily_reflections is
  '사용자가 직접 작성하는 날짜별 하루 일기. 외부 AI로 전송하지 않는다.';
