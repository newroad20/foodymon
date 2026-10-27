import { PGlite } from '@electric-sql/pglite';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const sql = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('pet chat consent, message limits and 30-day cleanup', async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  `);
  await db.exec(sql('schema.sql'));
  await db.exec(sql('010_pet_chat_history.sql'));
  await db.exec(sql('010_pet_chat_history.sql'));

  const user = '11111111-1111-1111-1111-111111111111';
  await db.query(`insert into auth.users values ($1, 'a@b.c', '{}')`, [user]);
  await db.query(
    `insert into public.pet_chat_preferences(user_id, history_enabled, consent_at)
     values ($1, true, now())`,
    [user]
  );
  const preference = (await db.query(`select * from public.pet_chat_preferences where user_id=$1`, [user])).rows[0];
  assert.equal(preference.history_enabled, true);

  await db.query(
    `insert into public.pet_chat_messages(user_id, role, content, created_at)
     values ($1, 'user', '오래된 이야기', now() - interval '31 days')`,
    [user]
  );
  await db.query(
    `insert into public.pet_chat_messages(user_id, role, content)
     values ($1, 'pet', '오늘도 잘 듣고 있어')`,
    [user]
  );
  const messages = (await db.query(`select content from public.pet_chat_messages where user_id=$1`, [user])).rows;
  assert.deepEqual(messages.map((row) => row.content), ['오늘도 잘 듣고 있어']);

  await assert.rejects(
    db.query(`insert into public.pet_chat_messages(user_id, role, content) values ($1, 'system', 'x')`, [user]),
    /check constraint/
  );
  await assert.rejects(
    db.query(`insert into public.pet_chat_messages(user_id, role, content) values ($1, 'user', '')`, [user]),
    /check constraint/
  );
  await db.close();
});
