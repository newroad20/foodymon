-- 푸디몬 v12 — 100일 여정
-- 부화한 날이 1일차이고, 기록을 쉰 날도 달력대로 지나간다. 끝나면 사용자가 골라서 새로 시작한다.
-- 성장 기준을 100일에 맞춰 500/1800/4000점으로 늘린다. 하루 평균 40점이면 100일째에 최종 단계에 닿는다.
-- 기존 사용자의 단계는 낮추지 않는다.

alter table public.profiles add column if not exists journey_start date;
grant update (journey_start) on public.profiles to authenticated;

update public.profiles set journey_start = created_at::date
 where onboarded and journey_start is null;

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

  need := case p.evolution_stage when 3 then 500 when 4 then 1800 when 5 then 4000 else null end;
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

comment on function public.sync_growth(date) is
  '누적 성장점을 동기화하고 500/1800/4000점에서 하루 최대 한 단계 성장시킨다.';

-- 이번 100일의 기록만 센다 (새로 시작하면 지난 여정은 기록 숲에서 본다).
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
                       where user_id = uid and log_date between lo and hi and status in ('ate','little','hard')),
    'mind_count',    (select count(*) from public.mind_records where user_id = uid and log_date between lo and hi),
    'goals_done',    (select count(*) from public.small_goals s
                       where s.user_id = uid and s.log_date between lo and hi and not s.held
                         and public.goal_points(uid, s.log_date, 0) = 20),
    'reflection',    (select reflection from public.profiles where id = uid)
  );
end; $$;

revoke all on function public.get_journey() from public, anon;
grant execute on function public.get_journey() to authenticated;
