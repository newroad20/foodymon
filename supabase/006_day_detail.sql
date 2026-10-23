-- =====================================================================
-- 푸디몬 v6 — 날짜별 기록 상세 + 시범 요약 (재형 님 피드백 6단계)
-- 전제: schema.sql, 002~005 를 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 내용:
--   1) profiles.reflection : 사용자가 직접 적는 "내가 느낀 변화"
--   2) get_day_points(p_day) : 그날 성장점과 근거 (수면·식사·마음·작은 목표)
--   3) get_journey() : 지금까지의 기록 요약 (며칠째, 누적 성장점, 단계, 항목별 기록 수)
-- =====================================================================

alter table public.profiles
  add column if not exists reflection text not null default ''
  check (length(reflection) <= 1000);
grant update (reflection) on public.profiles to authenticated;

create or replace function public.get_day_points(p_day date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p   record;
  g   public.small_goals%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into p from public.day_points(uid, p_day);
  select * into g from public.small_goals where user_id = uid and log_date = p_day;
  return jsonb_build_object(
    'sleep', p.sleep, 'meal', p.meal, 'mind', p.mind, 'goal', p.goal, 'total', p.total,
    'small_goal', case when g.kind is null then null
                       else jsonb_build_object('kind', g.kind, 'size', g.size, 'held', g.held) end
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
  first_d date;
  days    integer;
  total   integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select min(d) into first_d from (
    select min(log_date) d from public.sleep_records where user_id = uid
    union all select min(log_date) from public.meal_records where user_id = uid
    union all select min(log_date) from public.mind_records where user_id = uid) f;
  select count(*) into days from (
    select log_date from public.sleep_records where user_id = uid
    union select log_date from public.meal_records where user_id = uid
    union select log_date from public.mind_records where user_id = uid) d;
  select coalesce(sum(dp.total), 0) into total
    from (select log_date from public.sleep_records where user_id = uid
          union select log_date from public.meal_records where user_id = uid
          union select log_date from public.mind_records where user_id = uid) d,
         lateral public.day_points(uid, d.log_date) dp;

  return jsonb_build_object(
    'first_date',    first_d,
    'recorded_days', days,
    'total',         total,
    'level',         (select evolution_stage from public.profiles where id = uid),
    'sleep_count',   (select count(*) from public.sleep_records where user_id = uid),
    'meal_count',    (select count(*) from public.meal_records
                       where user_id = uid and status in ('ate','little','hard')),
    'mind_count',    (select count(*) from public.mind_records where user_id = uid),
    'goals_done',    (select count(*) from public.small_goals s
                       where s.user_id = uid and not s.held
                         and public.goal_points(uid, s.log_date, 0) = 20),
    'reflection',    (select reflection from public.profiles where id = uid)
  );
end; $$;

revoke all on function public.get_day_points(date) from public, anon;
revoke all on function public.get_journey() from public, anon;
grant execute on function public.get_day_points(date) to authenticated;
grant execute on function public.get_journey() to authenticated;
