-- =====================================================================
-- 푸디몬 v7 — 만 14세 미만 보호자 동의
-- 전제: schema.sql, 002~006 을 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 만 14세 미만일 수 있는 사용자(태어난 연도 기준)는 온보딩에서 보호자 이름·연락처와 동의를 받는다.
-- =====================================================================

alter table public.profiles
  add column if not exists guardian_name text check (length(guardian_name) <= 50),
  add column if not exists guardian_contact text check (length(guardian_contact) <= 100),
  add column if not exists guardian_consent_at timestamptz;

grant update (guardian_name, guardian_contact, guardian_consent_at) on public.profiles to authenticated;
