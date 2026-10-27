-- 푸디몬 v9 — 성장 속도 조정
-- 하루 최대 성장점은 100점이므로, 충실히 기록하면 약 2일마다 한 단계 성장한다.
-- 기존 사용자의 누적 성장점과 현재 단계는 낮추지 않는다.

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

comment on function public.sync_growth(date) is
  '누적 성장점을 동기화하고 200/400/600점에서 하루 최대 한 단계 성장시킨다.';
