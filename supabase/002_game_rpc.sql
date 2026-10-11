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

-- ---------- 2. 최근 7일 건강 지수 ----------
alter table public.profiles
  add column if not exists history_scores smallint[] not null default '{50,50,50}';

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
      else
        if p.streak > 0 then
          streak_reset := true;
        end if;
        p.streak := 0;
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
         last_checkin_date = p.last_checkin_date
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

-- ---------- 6. 실행 권한 ----------
revoke all on function public.ensure_profile()         from public, anon;
revoke all on function public.close_days(date)         from public, anon;
revoke all on function public.buy_item(text, text)     from public, anon;
grant execute on function public.ensure_profile()      to authenticated;
grant execute on function public.close_days(date)      to authenticated;
grant execute on function public.buy_item(text, text)  to authenticated;
