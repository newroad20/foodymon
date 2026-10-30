-- =====================================================================
-- 푸디몬(Foody-Mon) Supabase 스키마 v1
-- 기준: 현재 앱 코드 (AuthContext -> profiles, FoodyMonContext 상태값)
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run
-- 원칙:
--   1) 체중·칼로리 컬럼은 만들지 않는다 (Anti-Trigger 설계 원칙)
--   2) 젤리/스트릭/방패/진화단계는 클라이언트가 직접 수정할 수 없다
--      (변경은 추후 security definer 함수(RPC)로만 처리)
--   3) 모든 테이블은 RLS로 "내 데이터만" 접근
-- =====================================================================

-- ---------- 1. profiles (auth.users 1:1) ----------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  nickname             text not null default '',
  email                text,
  onboarded            boolean not null default false,
  target_sleep         numeric(3,1) not null default 7   check (target_sleep between 0 and 24),
  target_meals         smallint     not null default 3   check (target_meals between 0 and 10),
  usual_meal_size      numeric(3,2) not null default 1.0 check (usual_meal_size > 0),
  jelly_balance        integer  not null default 50 check (jelly_balance >= 0),
  streak               integer  not null default 0  check (streak >= 0),
  shields              integer  not null default 1  check (shields >= 0),
  evolution_stage      smallint not null default 3  check (evolution_stage between 1 and 6),
  equipped_costume     text,
  equipped_backgrounds text[]   not null default '{}',
  last_checkin_date    date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------- 2. daily_logs (하루 1행) ----------
create table if not exists public.daily_logs (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  log_date       date not null default current_date,
  sleep_hours    numeric(3,1) check (sleep_hours between 0 and 24),
  sleep_diff     numeric(3,1),
  meal_count     smallint not null default 0,
  bad_meal_count smallint not null default 0,
  emotion        smallint check (emotion between 0 and 100),
  emotion_note   text,                      -- 한 줄 자유 서술 (피드백 반영 예정)
  daily_score    smallint check (daily_score between 0 and 100),
  completed      boolean not null default false,
  primary key (user_id, log_date)
);

-- ---------- 3. checkin_logs (기록장/히스토리용 이벤트 로그) ----------
create table if not exists public.checkin_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null default current_date,
  type       text not null check (type in ('meal','sleep','emotion','skip')),
  content    text not null default '',      -- 숫자(칼로리 등) 저장 금지, 서술형만
  created_at timestamptz not null default now()
);
create index if not exists checkin_logs_user_time_idx
  on public.checkin_logs (user_id, created_at desc);

-- ---------- 4. user_items (보유 아이템) ----------
create table if not exists public.user_items (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_type   text not null check (item_type in ('costume','background')),
  item_id     text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

-- ---------- 5. 푸디몬 대화 자동 저장 (사용자 선택) ----------
create table if not exists public.pet_chat_preferences (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  history_enabled boolean not null default false,
  consent_at      timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists public.pet_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null check (role in ('user', 'pet')),
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists pet_chat_messages_user_time_idx
  on public.pet_chat_messages (user_id, created_at desc);

-- ---------- 6. 날짜별 하루 일기 ----------
create table if not exists public.daily_reflections (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  log_date   date not null default current_date,
  text       text not null default '' check (char_length(text) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

-- ---------- 7. updated_at 자동 갱신 ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists daily_reflections_set_updated_at on public.daily_reflections;
create trigger daily_reflections_set_updated_at
  before update on public.daily_reflections
  for each row execute function public.set_updated_at();

-- 새 메시지를 저장할 때 같은 사용자의 30일 지난 대화를 자동 정리한다.
create or replace function public.trim_old_pet_chat_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.pet_chat_messages
   where user_id = new.user_id
     and created_at < now() - interval '30 days';
  return new;
end; $$;

drop trigger if exists pet_chat_messages_trim_old on public.pet_chat_messages;
create trigger pet_chat_messages_trim_old
  after insert on public.pet_chat_messages
  for each row execute function public.trim_old_pet_chat_messages();

-- ---------- 8. 회원가입 시 프로필 자동 생성 ----------
-- (이메일 인증을 켜면 가입 직후 세션이 없어서 앱에서 직접 insert 하면 실패함.
--  그래서 DB 트리거가 nickname(메타데이터)을 읽어 프로필을 만든다.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', ''), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 9. RLS ----------
alter table public.profiles     enable row level security;
alter table public.daily_logs   enable row level security;
alter table public.checkin_logs enable row level security;
alter table public.user_items   enable row level security;
alter table public.pet_chat_preferences enable row level security;
alter table public.pet_chat_messages    enable row level security;
alter table public.daily_reflections    enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "daily_logs_own" on public.daily_logs;
create policy "daily_logs_own" on public.daily_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "checkin_logs_own" on public.checkin_logs;
create policy "checkin_logs_own" on public.checkin_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_items_select_own" on public.user_items;
create policy "user_items_select_own" on public.user_items
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "pet_chat_preferences_own" on public.pet_chat_preferences;
create policy "pet_chat_preferences_own" on public.pet_chat_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pet_chat_messages_own" on public.pet_chat_messages;
create policy "pet_chat_messages_own" on public.pet_chat_messages
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "daily_reflections_own" on public.daily_reflections;
create policy "daily_reflections_own" on public.daily_reflections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 10. 권한 (치팅 방지) ----------
revoke all on public.profiles, public.daily_logs, public.checkin_logs, public.user_items,
              public.pet_chat_preferences, public.pet_chat_messages, public.daily_reflections
  from anon, authenticated;

grant select on public.profiles to authenticated;
-- 클라이언트가 직접 바꿀 수 있는 컬럼만 허용 (jelly_balance, streak, shields, evolution_stage 제외)
grant update (nickname, onboarded, target_sleep, target_meals, usual_meal_size,
              equipped_costume, equipped_backgrounds)
  on public.profiles to authenticated;

grant select, insert, update, delete on public.daily_logs   to authenticated;
grant select, insert, update, delete on public.checkin_logs to authenticated;
grant select on public.user_items to authenticated;  -- 구매는 추후 RPC(buy_item)로만
grant select, insert, update, delete on public.pet_chat_preferences to authenticated;
grant select, insert, delete on public.pet_chat_messages to authenticated;
grant select, insert, update, delete on public.daily_reflections to authenticated;
