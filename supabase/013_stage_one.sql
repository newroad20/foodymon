-- 푸디몬 v13 — 1·2단계 추가
-- 새로 시작하는 푸디몬은 1단계에서 태어나 100/250/500/1800/4000점에서 한 단계씩 자란다.
-- 4~6단계 기준은 그대로라 이미 3단계 이상인 사용자는 바뀌는 게 없다. 단계는 낮추지 않는다.

alter table public.profiles alter column evolution_stage set default 1;

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

  need := case p.evolution_stage when 1 then 100 when 2 then 250 when 3 then 500
                       when 4 then 1800 when 5 then 4000 else null end;
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
  '누적 성장점을 동기화하고 100/250/500/1800/4000점에서 하루 최대 한 단계 성장시킨다.';
