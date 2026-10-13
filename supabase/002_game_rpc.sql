-- =====================================================================
-- 푸디몬(Foody-Mon) Supabase 스키마 v2 — 게임 진행 RPC
-- 전제: schema.sql(v1)을 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 내용:
--   1) shop_items  : 상점 가격표 (가격은 서버가 결정)
--   2) profiles.history_scores : 최근 7일 건강 지수
--   3) ensure_profile() : 프로필 행이 없으면 생성 (v1 이전 가입자 대비)
--   4) close_days(p_today) : 지난 날짜 마감 -> 스트릭/젤리/방패 계산
--   5) buy_item(p_type, p_id) : 젤리 차감 + 아이템 지급
--   6) backfill_yesterday(...) : 젤리 20개로 어제 기록 복구 (S25)
--   7) get_daily_quests / claim_quest : 오늘의 퀘스트 3개 (S70, 듀오링고식 쉬움·보통·어려움)
-- 규칙은 앱의 src/lib/dayRollover.ts 와 동일하게 유지할 것
-- =====================================================================

-- ---------- 1. 상점 가격표 ----------
create table if not exists public.shop_items (
  item_type text    not null check (item_type in ('costume','background')),
  item_id   text    not null,
  price     integer not null check (price >= 0),
  primary key (item_type, item_id)
);

insert into public.shop_items (item_type, item_id, price) values
  ('costume', 'crown', 50),
  ('costume', 'ribbon', 30),
  ('costume', 'glasses', 40),
  ('costume', 'flower', 20),
  ('costume', 'wizard', 60),
  ('costume', 'bunny', 50),
  ('background', 'carpet', 30),
  ('background', 'bookshelf', 50),
  ('background', 'plant', 40),
  ('background', 'plushie', 60)
on conflict (item_type, item_id) do update set price = excluded.price;

alter table public.shop_items enable row level security;
drop policy if exists "shop_items_read_all" on public.shop_items;
create policy "shop_items_read_all" on public.shop_items
  for select to authenticated using (true);
revoke all on public.shop_items from anon, authenticated;
grant select on public.shop_items to authenticated;

-- ---------- 2. 최근 7일 건강 지수 + 어제 복구 정보 ----------
alter table public.profiles
  add column if not exists history_scores smallint[] not null default '{50,50,50}';

-- 마지막 마감에서 "기록 없는 날"로 처리된 어제의 정보 (복구 시 되돌리기용).
-- 클라이언트 update 권한이 없는 컬럼이라 close_days / backfill_yesterday 만 바꿀 수 있다.
alter table public.profiles
  add column if not exists missed_date        date,
  add column if not exists missed_prev_streak integer,
  add column if not exists missed_used_shield boolean not null default false;

-- ---------- 3. 프로필 보장 ----------
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, nickname, email)
  select u.id, coalesce(u.raw_user_meta_data->>'nickname', ''), u.email
  from auth.users u
  where u.id = uid
  on conflict (id) do nothing;
end; $$;

-- ---------- 4. 하루 마감 ----------
-- p_today: 앱 기준 오늘(로컬 날짜). 시간대 차이를 고려해 서버 UTC 날짜 ±1일만 허용.
-- 마지막 활동일(last_checkin_date)은 기록 여부로 판정하고,
-- 그 사이 통째로 건너뛴 날은 기록 없는 날로 처리(방패 -> 없으면 스트릭 초기화).
create or replace function public.close_days(p_today date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid            uuid := auth.uid();
  server_today   date := (now() at time zone 'utc')::date;
  p              public.profiles%rowtype;
  days_passed    integer := 0;
  logged         boolean;
  day_score      smallint;
  rewarded_jelly integer := 0;
  shield_earned  boolean := false;
  shields_used   integer := 0;
  streak_reset   boolean := false;
  hist           smallint[];
  n              integer;
  streak_before  integer;
  day_shield     boolean;
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

  if p.last_checkin_date is null then
    -- 첫 사용: 오늘부터 시작
    p.last_checkin_date := p_today;
  else
    days_passed := p_today - p.last_checkin_date;
  end if;

  if days_passed > 0 then
    select (d.sleep_hours is not null or d.meal_count > 0 or d.emotion is not null),
           d.daily_score
      into logged, day_score
      from public.daily_logs d
     where d.user_id = uid and d.log_date = p.last_checkin_date;
    logged := coalesce(logged, false);
    hist := p.history_scores;

    for i in 1..days_passed loop
      if i > 1 then
        -- 통째로 건너뛴 날
        logged := false;
        day_score := null;
      end if;

      streak_before := p.streak;
      day_shield := false;

      if logged then
        p.streak := p.streak + 1;
        rewarded_jelly := 10 + (p.streak / 3) * 5;
        p.jelly_balance := p.jelly_balance + rewarded_jelly;
        if p.streak % 7 = 0 then
          p.shields := p.shields + 1;
          shield_earned := true;
        end if;
      elsif p.shields > 0 then
        p.shields := p.shields - 1;
        shields_used := shields_used + 1;
        day_shield := true;
      else
        if p.streak > 0 then
          streak_reset := true;
        end if;
        p.streak := 0;
      end if;

      -- 마지막으로 마감한 날(= 어제)이 기록 없는 날이면 복구할 수 있도록 기억
      if i = days_passed then
        if logged then
          p.missed_date := null;
          p.missed_prev_streak := null;
          p.missed_used_shield := false;
        else
          p.missed_date := p_today - 1;
          p.missed_prev_streak := streak_before;
          p.missed_used_shield := day_shield;
        end if;
      end if;

      hist := hist || coalesce(day_score, 40::smallint);
      n := coalesce(array_length(hist, 1), 0);
      if n > 7 then
        hist := hist[n - 6:n];
      end if;
    end loop;

    p.history_scores := hist;
    p.last_checkin_date := p_today;
  end if;

  update public.profiles
     set streak            = p.streak,
         shields           = p.shields,
         jelly_balance     = p.jelly_balance,
         history_scores    = p.history_scores,
         last_checkin_date = p.last_checkin_date,
         missed_date        = p.missed_date,
         missed_prev_streak = p.missed_prev_streak,
         missed_used_shield = p.missed_used_shield
   where id = uid;

  return jsonb_build_object(
    'days_passed',    greatest(days_passed, 0),
    'missed_days',    greatest(days_passed - 1, 0),
    'rewarded_jelly', rewarded_jelly,
    'shield_earned',  shield_earned,
    'shields_used',   shields_used,
    'streak_reset',   streak_reset,
    'streak',         p.streak,
    'shields',        p.shields,
    'jelly_balance',  p.jelly_balance,
    'history_scores', to_jsonb(p.history_scores),
    'last_checkin_date', p.last_checkin_date
  );
end; $$;

-- ---------- 5. 아이템 구매 ----------
create or replace function public.buy_item(p_type text, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  v_price integer;
  balance integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select price into v_price
    from public.shop_items
   where item_type = p_type and item_id = p_id;
  if not found then
    raise exception 'item not found';
  end if;

  select jelly_balance into balance
    from public.profiles where id = uid for update;
  if not found then
    raise exception 'profile not found';
  end if;

  if exists (select 1 from public.user_items
              where user_id = uid and item_type = p_type and item_id = p_id) then
    raise exception 'already owned';
  end if;
  if balance < v_price then
    raise exception 'insufficient jelly';
  end if;

  insert into public.user_items (user_id, item_type, item_id)
  values (uid, p_type, p_id);

  update public.profiles
     set jelly_balance = jelly_balance - v_price
   where id = uid
  returning jelly_balance into balance;

  return jsonb_build_object('jelly_balance', balance);
end; $$;

-- ---------- 6. 어제 기록 복구 (S25) ----------
-- 젤리 20개를 내고, 마지막 마감에서 기록 없는 날로 처리된 "어제"에 체크인을 채운다.
-- 효과: 끊긴 연속 기록을 이어 주고(어제를 기록한 날로 계산), 어제 쓴 방패를 돌려준다.
-- 출석 젤리 보상과 7일 방패 보너스는 주지 않는다.
create or replace function public.backfill_yesterday(
  p_today          date,
  p_sleep_hours    numeric,
  p_sleep_diff     numeric,
  p_meal_count     smallint,
  p_bad_meal_count smallint,
  p_emotion        smallint,
  p_daily_score    smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  server_today date := (now() at time zone 'utc')::date;
  cost         constant integer := 20;
  p            public.profiles%rowtype;
  n            integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_today is null or p_today < server_today - 1 or p_today > server_today + 1 then
    raise exception 'invalid date %', p_today;
  end if;
  if p_sleep_hours is null and coalesce(p_meal_count, 0) = 0 and p_emotion is null then
    raise exception 'empty backfill';
  end if;
  if p_daily_score is null or p_daily_score < 0 or p_daily_score > 100 then
    raise exception 'invalid score';
  end if;

  select * into p from public.profiles where id = uid for update;
  if not found then
    raise exception 'profile not found';
  end if;
  if p.missed_date is null or p.missed_date <> p_today - 1 or p.last_checkin_date <> p_today then
    raise exception 'nothing to backfill';
  end if;
  if p.jelly_balance < cost then
    raise exception 'insufficient jelly';
  end if;

  insert into public.daily_logs
    (user_id, log_date, sleep_hours, sleep_diff, meal_count, bad_meal_count, emotion, daily_score)
  values
    (uid, p.missed_date, p_sleep_hours, p_sleep_diff, coalesce(p_meal_count, 0),
     coalesce(p_bad_meal_count, 0), p_emotion, p_daily_score)
  on conflict (user_id, log_date) do update set
    sleep_hours    = excluded.sleep_hours,
    sleep_diff     = excluded.sleep_diff,
    meal_count     = excluded.meal_count,
    bad_meal_count = excluded.bad_meal_count,
    emotion        = excluded.emotion,
    daily_score    = excluded.daily_score;

  -- 어제를 "기록한 날"로 다시 계산. 오늘은 아직 마감 전이라 연속 기록이 바뀌지 않았다.
  p.streak := coalesce(p.missed_prev_streak, 0) + 1;
  if p.missed_used_shield then
    p.shields := p.shields + 1;
  end if;
  p.jelly_balance := p.jelly_balance - cost;

  -- 히스토리의 마지막 값(어제, 기록 없음 40점)을 실제 점수로 교체
  n := coalesce(array_length(p.history_scores, 1), 0);
  if n > 0 then
    p.history_scores[n] := p_daily_score;
  end if;

  update public.profiles
     set streak             = p.streak,
         shields            = p.shields,
         jelly_balance      = p.jelly_balance,
         history_scores     = p.history_scores,
         missed_date        = null,
         missed_prev_streak = null,
         missed_used_shield = false
   where id = uid;

  return jsonb_build_object(
    'streak',         p.streak,
    'shields',        p.shields,
    'jelly_balance',  p.jelly_balance,
    'shield_refunded', p.missed_used_shield
  );
end; $$;

-- ---------- 7. 오늘의 퀘스트 (S70) ----------
-- 매일 난이도별(1 쉬움 · 2 보통 · 3 어려움) 1개씩 3개. 날짜로 돌아가며 정해져 모두에게 같다.
-- 달성 여부는 오늘 daily_logs 로 서버가 판정하고, 보상 젤리도 서버만 지급한다.
create table if not exists public.quest_defs (
  id     text primary key,
  tier   smallint not null check (tier between 1 and 3),
  title  text not null,
  reward integer not null check (reward >= 0)
);

insert into public.quest_defs (id, tier, title, reward) values
  ('log_meal',     1, '식사 1번 기록하기',              5),
  ('log_sleep',    1, '수면 기록하기',                  5),
  ('log_emotion',  1, '오늘 기분 체크하기',             5),
  ('meals_2',      2, '식사 2번 기록하기',             10),
  ('all_three',    2, '수면·식사·감정 모두 기록하기',  10),
  ('sleep_goal',   2, '목표 수면 시간 ±1시간 지키기',  10),
  ('meals_target', 3, '목표 끼니 모두 기록하기',       15),
  ('good_meals_2', 3, '식사 3번 기록하기',             15),  -- id 유지: quest_claims 가 참조
  ('score_70',     3, '건강 지수 70점 넘기기',         15)
on conflict (id) do update set tier = excluded.tier, title = excluded.title, reward = excluded.reward;

create table if not exists public.quest_claims (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  quest_date date not null,
  quest_id   text not null references public.quest_defs(id),
  reward     integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_date, quest_id)
);

alter table public.quest_defs   enable row level security;
alter table public.quest_claims enable row level security;
drop policy if exists "quest_defs_read_all" on public.quest_defs;
create policy "quest_defs_read_all" on public.quest_defs for select to authenticated using (true);
drop policy if exists "quest_claims_select_own" on public.quest_claims;
create policy "quest_claims_select_own" on public.quest_claims
  for select to authenticated using (user_id = auth.uid());
revoke all on public.quest_defs, public.quest_claims from anon, authenticated;
grant select on public.quest_defs, public.quest_claims to authenticated;

-- 오늘의 퀘스트 id 3개 (난이도 순)
create or replace function public.daily_quest_ids(p_day date)
returns text[]
language sql
stable
set search_path = public
as $$
  select array_agg(id order by tier)
  from (
    select distinct on (tier) id, tier
    from (
      select id, tier,
             row_number() over (partition by tier order by id) - 1 as idx,
             count(*) over (partition by tier) as n
      from public.quest_defs
    ) q
    where idx = (p_day - date '2026-01-01') % n
    order by tier
  ) picked;
$$;

-- 진행도 (progress / target). 오늘 기록이 없으면 0.
create or replace function public.quest_progress(p_uid uuid, p_day date, p_quest text)
returns table (progress integer, target integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d  public.daily_logs%rowtype;
  tm integer;
begin
  select * into d from public.daily_logs where user_id = p_uid and log_date = p_day;
  select target_meals into tm from public.profiles where id = p_uid;
  d.meal_count := coalesce(d.meal_count, 0);
  d.bad_meal_count := coalesce(d.bad_meal_count, 0);

  case p_quest
    when 'log_meal'     then return query select least(d.meal_count, 1), 1;
    when 'log_sleep'    then return query select (d.sleep_hours is not null)::int, 1;
    when 'log_emotion'  then return query select (d.emotion is not null)::int, 1;
    when 'meals_2'      then return query select least(d.meal_count, 2), 2;
    when 'all_three'    then return query select (d.sleep_hours is not null)::int
                                               + (d.meal_count > 0)::int
                                               + (d.emotion is not null)::int, 3;
    when 'sleep_goal'   then return query select coalesce((d.sleep_diff <= 1)::int, 0), 1;
    when 'meals_target' then return query select least(d.meal_count, greatest(tm, 1)), greatest(tm, 1);
    when 'good_meals_2' then return query select least(d.meal_count, 3), 3;
    when 'score_70'     then return query select least(coalesce(d.daily_score, 0)::int, 70), 70;
    else raise exception 'unknown quest %', p_quest;
  end case;
end; $$;

create or replace function public.get_daily_quests(p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  server_today date := (now() at time zone 'utc')::date;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_today is null or p_today < server_today - 1 or p_today > server_today + 1 then
    raise exception 'invalid date %', p_today;
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', q.id, 'tier', q.tier, 'title', q.title, 'reward', q.reward,
             'progress', pr.progress, 'target', pr.target,
             'claimed', c.quest_id is not null
           ) order by q.tier), '[]'::jsonb)
    from unnest(public.daily_quest_ids(p_today)) as t(id)
    join public.quest_defs q on q.id = t.id
    cross join lateral public.quest_progress(uid, p_today, q.id) pr
    left join public.quest_claims c
      on c.user_id = uid and c.quest_date = p_today and c.quest_id = q.id
  );
end; $$;

create or replace function public.claim_quest(p_today date, p_quest text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  server_today date := (now() at time zone 'utc')::date;
  v_reward     integer;
  pr           record;
  balance      integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_today is null or p_today < server_today - 1 or p_today > server_today + 1 then
    raise exception 'invalid date %', p_today;
  end if;
  if not (p_quest = any (public.daily_quest_ids(p_today))) then
    raise exception 'not today''s quest';
  end if;

  select reward into v_reward from public.quest_defs where id = p_quest;
  select * into pr from public.quest_progress(uid, p_today, p_quest);
  if pr.progress < pr.target then
    raise exception 'quest not complete';
  end if;

  perform 1 from public.profiles where id = uid for update;
  insert into public.quest_claims (user_id, quest_date, quest_id, reward)
  values (uid, p_today, p_quest, v_reward)
  on conflict do nothing;
  if not found then
    raise exception 'already claimed';
  end if;

  update public.profiles
     set jelly_balance = jelly_balance + v_reward
   where id = uid
  returning jelly_balance into balance;

  return jsonb_build_object('reward', v_reward, 'jelly_balance', balance);
end; $$;

-- ---------- 8. 실행 권한 ----------
revoke all on function public.ensure_profile()         from public, anon;
revoke all on function public.close_days(date)         from public, anon;
revoke all on function public.buy_item(text, text)     from public, anon;
revoke all on function public.backfill_yesterday(date, numeric, numeric, smallint, smallint, smallint, smallint) from public, anon;
grant execute on function public.ensure_profile()      to authenticated;
grant execute on function public.close_days(date)      to authenticated;
grant execute on function public.buy_item(text, text)  to authenticated;
grant execute on function public.backfill_yesterday(date, numeric, numeric, smallint, smallint, smallint, smallint) to authenticated;
revoke all on function public.daily_quest_ids(date)              from public, anon;
revoke all on function public.quest_progress(uuid, date, text)   from public, anon, authenticated;
revoke all on function public.get_daily_quests(date)             from public, anon;
revoke all on function public.claim_quest(date, text)            from public, anon;
grant execute on function public.daily_quest_ids(date)           to authenticated;
grant execute on function public.get_daily_quests(date)          to authenticated;
grant execute on function public.claim_quest(date, text)         to authenticated;
