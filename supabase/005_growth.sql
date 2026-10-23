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

-- ---------- 2. 진화 상태 ----------
-- evolution_stage(schema.sql, 기본 3)를 성장 단계로 쓴다. 클라이언트는 바꿀 수 없다.
alter table public.profiles
  add column if not exists last_evolved_date date;

-- ---------- 3. 하루 성장점 ----------
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
begin
  select birth_year into by_year from public.profiles where id = p_uid;
  age := extract(year from p_day)::integer - coalesce(by_year, 0);

  -- 수면: 연령별 권장 범위 (6~12세 9~12시간, 13세 이상 8~10시간; 연도 모르면 13세 이상 기준)
  select minutes into m from public.sleep_records where user_id = p_uid and log_date = p_day;
  sleep := 0;
  if m is not null then
    areas := areas + 1;
    if by_year is not null and age <= 12 then
      sleep := case when m > 720 then 24 when m >= 540 then 30 when m >= 480 then 24
                    when m >= 420 then 18 else 10 end;
    else
      sleep := case when m > 600 then 24 when m >= 480 then 30 when m >= 420 then 24
                    when m >= 360 then 18 else 10 end;
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

  -- 작은 목표(초반): 세 영역 중 2개 이상 기록 20, 1개 10
  goal := case when areas >= 2 then 20 when areas = 1 then 10 else 0 end;

  total := least(100, sleep + meal + mind + goal);
  return next;
end; $$;

-- ---------- 4. 누적 성장점과 진화 ----------
-- 단계별 필요 누적점: Lv.4 60, Lv.5 140, Lv.6 230. 하루 최대 1번, 단계를 건너뛰지 않는다.
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

  need := case p.evolution_stage when 3 then 60 when 4 then 140 when 5 then 230 else null end;
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

revoke all on function public.day_points(uuid, date) from public, anon, authenticated;
revoke all on function public.sync_growth(date) from public, anon;
grant execute on function public.sync_growth(date) to authenticated;
