-- =====================================================================
-- 푸디몬 v5 — 기록 개편 + 누적 성장점 (재형 님 점수 기준표 2026-10-21)
-- 전제: schema.sql, 002, 003, 004 를 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 내용:
--   1) sleep_records : 날짜별 수면 1개 (취침·기상 시각 -> 수면 시간 자동 계산)
--   2) meal_records  : 날짜 x 6칸 (아침·오전 간식·점심·오후 간식·저녁·저녁 간식)
--   3) mind_records  : 하루 최대 3개 (감정 + 상황 + 이야기)
--   4) day_points(...) : 하루 성장점 = 수면 30 + 식사 40 + 마음 10 + 작은 목표 20 (최대 100)
--   5) sync_growth(p_today) : 누적 성장점으로 진화 (Lv.4 60 / Lv.5 140 / Lv.6 230, 하루 1번, 내려가지 않음)
--   6) small_goals + goal_points + get_small_goal : 작은 목표 (관찰 기간 뒤 하루 1개, 시작·바꾸기·보류)
-- 성장점은 기록에서 서버가 계산한다. 기록을 고치면 점수도 다시 계산된다(차액만 반영되는 효과).
-- 규칙은 앱의 src/lib/growth.ts 와 같아야 한다.
-- =====================================================================

-- ---------- 1. 기록 표 ----------
create table if not exists public.sleep_records (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null,
  bed_time   time not null,
  wake_time  time not null,
  -- 자정을 넘긴 잠도 계산 (23:00 -> 07:00 = 480분)
  minutes    integer generated always as
               ((((extract(epoch from (wake_time - bed_time)) / 60)::integer % 1440) + 1440) % 1440) stored,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

create table if not exists public.meal_records (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null,
  slot       smallint not null check (slot between 0 and 5),
  status     text not null check (status in ('ate','little','hard','skipped','no_answer')),
  menu       text not null default '' check (length(menu) <= 100),
  feeling    text not null default '' check (length(feeling) <= 300),
  memo       text not null default '' check (length(memo) <= 300),
  photo_path text,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date, slot)
);

create table if not exists public.mind_records (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null,
  emotion    text not null check (emotion in
               ('very_good','good','okay','tired','very_hard','unsure','no_answer')),
  situation  text check (situation in
               ('meal','body','school','family','sleep_health','unknown','custom')),
  note       text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists mind_records_user_day_idx on public.mind_records (user_id, log_date);

-- 기록 날짜는 서버 기준 어제~내일만 (지난 날 몰아서 점수 쌓기 방지). 마음 기록은 하루 3개까지.
create or replace function public.check_record_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  server_today date := (now() at time zone 'utc')::date;
begin
  if new.log_date < server_today - 1 or new.log_date > server_today + 1 then
    raise exception 'invalid date %', new.log_date;
  end if;
  if tg_table_name = 'mind_records' and tg_op = 'INSERT' and
     (select count(*) from public.mind_records
       where user_id = new.user_id and log_date = new.log_date) >= 3 then
    raise exception 'mind limit';
  end if;
  return new;
end; $$;

drop trigger if exists sleep_records_check on public.sleep_records;
create trigger sleep_records_check before insert or update on public.sleep_records
  for each row execute function public.check_record_write();
drop trigger if exists meal_records_check on public.meal_records;
create trigger meal_records_check before insert or update on public.meal_records
  for each row execute function public.check_record_write();
drop trigger if exists mind_records_check on public.mind_records;
create trigger mind_records_check before insert or update on public.mind_records
  for each row execute function public.check_record_write();

alter table public.sleep_records enable row level security;
alter table public.meal_records  enable row level security;
alter table public.mind_records  enable row level security;

drop policy if exists "sleep_records_own" on public.sleep_records;
create policy "sleep_records_own" on public.sleep_records
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "meal_records_own" on public.meal_records;
create policy "meal_records_own" on public.meal_records
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "mind_records_own" on public.mind_records;
create policy "mind_records_own" on public.mind_records
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.sleep_records, public.meal_records, public.mind_records from anon;
grant select, insert, update, delete on public.sleep_records to authenticated;
grant select, insert, update, delete on public.meal_records  to authenticated;
grant select, insert, update, delete on public.mind_records  to authenticated;

-- 작은 목표: 하루 1개. kind 별 size = 식사 추가 횟수(1) / 취침 앞당길 분(15·30) / 감정 이유(1).
create table if not exists public.small_goals (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null,
  kind       text not null check (kind in ('more_meal','earlier_bed','mind_reason')),
  size       smallint not null default 1 check (size between 1 and 60),
  held       boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, log_date)
);
drop trigger if exists small_goals_check on public.small_goals;
create trigger small_goals_check before insert or update on public.small_goals
  for each row execute function public.check_record_write();
alter table public.small_goals enable row level security;
drop policy if exists "small_goals_own" on public.small_goals;
create policy "small_goals_own" on public.small_goals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.small_goals from anon;
grant select, insert, update, delete on public.small_goals to authenticated;

-- ---------- 2. 진화 상태 ----------
-- evolution_stage(schema.sql, 기본 3)를 성장 단계로 쓴다. 클라이언트는 바꿀 수 없다.
alter table public.profiles
  add column if not exists last_evolved_date date;

-- ---------- 3. 하루 성장점 ----------
-- 관찰 기간(일): 시범 배포 1일, 실제 출시 때 7로 바꾼다. 앱의 OBSERVE_DAYS 와 같아야 함.
create or replace function public.observe_days() returns integer language sql immutable as $$ select 1 $$;

-- 취침 시각을 저녁 6시부터 잰 분으로 (자정 넘긴 취침도 "늦게"로 비교되게)
create or replace function public.night_minutes(t time) returns integer language sql immutable as $$
  select ((extract(hour from t)::integer * 60 + extract(minute from t)::integer) - 1080 + 1440) % 1440
$$;

-- 작은 목표 점수: 완료 20 · 일부 10 · 시도 5 · 미시도 0.
-- 관찰 기간이거나 목표를 고르지 않았거나 보류한 날은 관찰 규칙(세 영역 중 2개 이상 20, 1개 10).
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
    select count(*) filter (where status in ('ate','little','hard')) into base
      from public.meal_records where user_id = p_uid and log_date = p_day - 1;
    select count(*) filter (where status in ('ate','little','hard')) into today_n
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

  -- 수면: 연령별 권장 총량과 취침 시각을 함께 본다. 기존 날짜에는 새 시각 규칙을 소급하지 않는다.
  select minutes, bed_time into m, bed from public.sleep_records where user_id = p_uid and log_date = p_day;
  sleep := 0;
  if m is not null then
    areas := areas + 1;
    if by_year is not null and age <= 12 then
      min_m := 540; max_m := 720; start_n := 60; end_n := 180;
    elsif by_year is not null and age <= 18 then
      min_m := 480; max_m := 600; start_n := 180; end_n := 240;
    else
      min_m := 420; max_m := 540; start_n := 240; end_n := 300;
    end if;
    sleep := case when m > max_m then 24 when m >= min_m then 30
                  when m >= min_m - 60 then 24 when m >= min_m - 120 then 18 else 10 end;
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

  -- 식사: 여섯 칸 중 먹은 칸 수 (먹었음·조금 먹었음·먹기 어려웠음). 양·메뉴·사진은 점수와 무관.
  select count(*) filter (where status in ('ate','little','hard')), count(*)
    into eaten, m
    from public.meal_records where user_id = p_uid and log_date = p_day;
  meal := (array[0,10,20,28,34,38,40])[least(eaten, 6) + 1];
  if m > 0 then areas := areas + 1; end if;

  -- 마음: 어떤 감정이든 같은 점수. 감정+상황(또는 이야기) 10, 감정만·답하고 싶지 않음 5.
  select coalesce(max(case when emotion <> 'no_answer' and (situation is not null or note <> '')
                           then 10 else 5 end), 0)
    into mind
    from public.mind_records where user_id = p_uid and log_date = p_day;
  if mind > 0 then areas := areas + 1; end if;

  goal := public.goal_points(p_uid, p_day, areas);

  total := least(100, sleep + meal + mind + goal);
  return next;
end; $$;

-- ---------- 4. 누적 성장점과 진화 ----------
-- 단계별 필요 누적점: Lv.4 200, Lv.5 400, Lv.6 600. 완전 기록 기준 약 2일마다 성장한다.
-- 하루 최대 1번, 단계를 건너뛰지 않는다.
create or replace function public.sync_growth(p_today date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  server_today date := (now() at time zone 'utc')::date;
  p            public.profiles%rowtype;
  total        integer;
  need         integer;
  evolved      boolean := false;
  today        record;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_today is null or p_today < server_today - 1 or p_today > server_today + 1 then
    raise exception 'invalid date %', p_today;
  end if;

  select * into p from public.profiles where id = uid for update;
  if not found then
    raise exception 'profile not found';
  end if;

  select coalesce(sum(d.total), 0) into total
    from (select log_date from public.sleep_records where user_id = uid
          union select log_date from public.meal_records where user_id = uid
          union select log_date from public.mind_records where user_id = uid) days,
         lateral public.day_points(uid, days.log_date) d;

  need := case p.evolution_stage when 3 then 200 when 4 then 400 when 5 then 600 else null end;
  if need is not null and total >= need
     and (p.last_evolved_date is null or p.last_evolved_date < p_today) then
    p.evolution_stage := p.evolution_stage + 1;
    p.last_evolved_date := p_today;
    evolved := true;
    update public.profiles
       set evolution_stage = p.evolution_stage, last_evolved_date = p.last_evolved_date
     where id = uid;
  end if;

  select * into today from public.day_points(uid, p_today);

  return jsonb_build_object(
    'total',   total,
    'level',   p.evolution_stage,
    'evolved', evolved,
    'today',   jsonb_build_object('sleep', today.sleep, 'meal', today.meal, 'mind', today.mind,
                                  'goal', today.goal, 'total', today.total)
  );
end; $$;

-- ---------- 5. 오늘의 작은 목표 ----------
-- 앱이 목표 카드에 쓰는 정보: 몇 일차인지, 관찰 중인지, 고른 목표, 어제 기준값, 추천 목표, 지금 점수.
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
  if uid is null then
    raise exception 'not authenticated';
  end if;
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
    'day',        (p_today - coalesce(first_d, p_today)) + 1,
    'observing',  (p_today - coalesce(first_d, p_today)) < public.observe_days(),
    'goal',       case when g.kind is null then null
                       else jsonb_build_object('kind', g.kind, 'size', g.size, 'held', g.held) end,
    'yesterday',  jsonb_build_object('eaten', y_eaten, 'bed_time', to_char(y_bed, 'HH24:MI'),
                                     'sleep_minutes', y_sleep, 'bedtime_ok', bedtime_ok),
    'target_meals', greatest(target_n, 1),
    'recommended_bed_start', to_char((time '18:00' + start_n * interval '1 minute')::time, 'HH24:MI'),
    'recommended_bed_end', to_char((time '18:00' + end_n * interval '1 minute')::time, 'HH24:MI'),
    'needs_prompt', needs_prompt,
    'suggestion', suggestion,
    'points',     pts.goal
  );
end; $$;

revoke all on function public.day_points(uuid, date) from public, anon, authenticated;
revoke all on function public.goal_points(uuid, date, integer) from public, anon, authenticated;
revoke all on function public.get_small_goal(date) from public, anon;
grant execute on function public.get_small_goal(date) to authenticated;
revoke all on function public.sync_growth(date) from public, anon;
grant execute on function public.sync_growth(date) to authenticated;
