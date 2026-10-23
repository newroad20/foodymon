-- =====================================================================
-- 푸디몬 v4 — 태어난 연도
-- 전제: schema.sql, 002, 003 을 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 연령별 권장 수면 범위(6~12세 / 13~18세)를 고르는 데만 쓴다. 생년월일 전체는 받지 않는다.
-- =====================================================================

alter table public.profiles
  add column if not exists birth_year smallint
  check (birth_year is null or birth_year between 1900 and 2100);

grant update (birth_year) on public.profiles to authenticated;
