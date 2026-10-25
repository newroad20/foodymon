-- =====================================================================
-- 푸디몬 v8 — 사용 기록 (팀 테스트·시범 운영 분석용)
-- 전제: schema.sql, 002~007 을 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 앱 열기/닫기, 화면 이동, 기록 창 열기만 남긴다. 기록 내용·상담 번호 등 민감한 값은 넣지 않는다.
-- 앱은 쓰기만 하고 읽지 않는다 (팀은 대시보드 Table Editor 에서 보거나 CSV 로 내려받기).
-- =====================================================================

create table if not exists public.app_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (name in ('app_open', 'app_close', 'screen', 'sheet_open')),
  detail     text not null default '' check (length(detail) <= 60),
  platform   text not null default '' check (length(platform) <= 10),
  created_at timestamptz not null default now()
);
create index if not exists app_events_user_time_idx on public.app_events (user_id, created_at);

alter table public.app_events enable row level security;
drop policy if exists "app_events_insert_own" on public.app_events;
create policy "app_events_insert_own" on public.app_events
  for insert to authenticated with check (user_id = auth.uid());

revoke all on public.app_events from anon, authenticated;
grant insert (user_id, name, detail, platform) on public.app_events to authenticated;
