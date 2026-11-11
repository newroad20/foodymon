-- 푸디몬 v15 — 농부 의상(밀짚모자) 추가
insert into public.shop_items (item_type, item_id, price) values
  ('costume', 'farmer', 50)
on conflict (item_type, item_id) do update set price = excluded.price;
