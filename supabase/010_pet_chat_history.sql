-- 푸디몬 v10 — 대화 자동 저장 동의와 30일 대화 기록
-- 사용자가 대화창에서 동의한 경우에만 앱이 메시지를 저장한다.

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

alter table public.pet_chat_preferences enable row level security;
alter table public.pet_chat_messages enable row level security;

drop policy if exists "pet_chat_preferences_own" on public.pet_chat_preferences;
create policy "pet_chat_preferences_own" on public.pet_chat_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pet_chat_messages_own" on public.pet_chat_messages;
create policy "pet_chat_messages_own" on public.pet_chat_messages
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.pet_chat_preferences, public.pet_chat_messages from anon, authenticated;
grant select, insert, update, delete on public.pet_chat_preferences to authenticated;
grant select, insert, delete on public.pet_chat_messages to authenticated;

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

comment on table public.pet_chat_preferences is
  '푸디몬 대화 자동 저장 동의 상태. 대화창에서 사용자가 직접 선택한다.';
comment on table public.pet_chat_messages is
  '푸디몬과 나눈 최근 30일 대화. 외부 AI에는 전송하지 않는다.';
