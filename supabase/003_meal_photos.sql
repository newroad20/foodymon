-- =====================================================================
-- 푸디몬 v3 — 식사 사진
-- 전제: schema.sql, 002_game_rpc.sql 을 먼저 실행했을 것
-- 실행: Supabase 대시보드 -> SQL Editor -> 전체 붙여넣기 -> Run (여러 번 실행해도 안전)
-- 내용:
--   1) checkin_logs.photo_path : 기록에 붙인 사진의 Storage 경로 (없으면 null)
--   2) Storage 버킷 meal-photos (비공개, jpeg, 5MB 이하)
--   3) 본인 폴더(<user id>/...)의 사진만 올리고·보고·지울 수 있는 정책
-- 사진은 계정 삭제 때 cascade 되지 않으므로 앱이 탈퇴 전에 Storage API 로 먼저 지운다.
-- =====================================================================

alter table public.checkin_logs
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meal_photos_select_own" on storage.objects;
create policy "meal_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "meal_photos_insert_own" on storage.objects;
create policy "meal_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "meal_photos_delete_own" on storage.objects;
create policy "meal_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
