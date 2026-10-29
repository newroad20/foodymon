-- =====================================================================
-- 푸디몬 v11 — 아동 모드
-- 전제: schema.sql, 002~010 을 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 보호자가 켜는 화면 설정. 켜져 있으면 앱이 사용 기록(app_events)을 남기지 않고,
-- 사진·자유 입력을 숨기고, 앱 밖으로 나가는 동작은 보호자 확인 뒤에만 한다 (Apple 1.3 / Google Families).
-- =====================================================================

alter table public.profiles
  add column if not exists kid_mode boolean not null default false;

grant update (kid_mode) on public.profiles to authenticated;
