import { PGlite } from '@electric-sql/pglite';
// Runs schema.sql + 002 + 004 + 005 in PGlite and checks growth points (003 needs Supabase Storage).
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const sql = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('growth: day_points, record limits, sync_growth evolution', async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  `);
  for (const f of ['schema.sql', '002_game_rpc.sql', '004_birth_year.sql', '005_growth.sql', '005_growth.sql']) {
    await db.exec(sql(f));
  }
  const U = '11111111-1111-1111-1111-111111111111';
  const q = async (s, p = []) => (await db.query(s, p)).rows;
  await db.query(`insert into auth.users values ($1,'a@b.c','{}')`, [U]);
  await db.exec(`select set_config('test.uid', '${U}', false)`);
  const today = (await q(`select (now() at time zone 'utc')::date::text d`))[0].d;
  const points = async (day = today) => (await q(`select * from public.day_points($1, $2::date)`, [U, day]))[0];
  const sync = async (day = today) => (await q(`select public.sync_growth($1::date) r`, [day]))[0].r;
  const setYear = (y) => q(`update public.profiles set birth_year=$2 where id=$1`, [U, y]);

  // nothing logged
  assert.deepEqual(await points(), { sleep: 0, meal: 0, mind: 0, goal: 0, total: 0 });

  // sleep across midnight, 13+ band (no birth year): 23:00 -> 07:00 = 8h -> 30
  await q(`insert into public.sleep_records(user_id,log_date,bed_time,wake_time) values ($1,$2,'23:00','07:00')`, [U, today]);
  assert.equal((await q(`select minutes from public.sleep_records`))[0].minutes, 480);
  assert.deepEqual(await points(), { sleep: 30, meal: 0, mind: 0, goal: 10, total: 40 });

  // 6-12 band: 8h -> 24; 13-18 band: 8h -> 30; edits replace the score
  const year = Number(today.slice(0, 4));
  await setYear(year - 10);
  assert.equal((await points()).sleep, 24);
  await q(`update public.sleep_records set wake_time='08:30' where user_id=$1`, [U]); // 9.5h
  assert.equal((await points()).sleep, 30);
  await setYear(year - 15);
  assert.equal((await points()).sleep, 30); // 9.5h within 8-10
  await q(`update public.sleep_records set bed_time='01:00', wake_time='06:30' where user_id=$1`, [U]); // 5.5h
  assert.equal((await points()).sleep, 10);

  // meals: only eaten slots count (ate/little/hard), 3 eaten -> 28
  for (const [slot, status] of [[0, 'ate'], [2, 'little'], [4, 'hard'], [1, 'skipped'], [5, 'no_answer']]) {
    await q(`insert into public.meal_records(user_id,log_date,slot,status) values ($1,$2,$3,$4)`, [U, today, slot, status]);
  }
  assert.equal((await points()).meal, 28);

  // mind: any feeling scores the same; emotion only 5, with a situation 10; max 3 a day
  await q(`insert into public.mind_records(user_id,log_date,emotion) values ($1,$2,'very_hard')`, [U, today]);
  assert.equal((await points()).mind, 5);
  await q(`insert into public.mind_records(user_id,log_date,emotion,situation) values ($1,$2,'very_hard','school')`, [U, today]);
  assert.equal((await points()).mind, 10);
  await q(`insert into public.mind_records(user_id,log_date,emotion) values ($1,$2,'no_answer')`, [U, today]);
  await assert.rejects(q(`insert into public.mind_records(user_id,log_date,emotion) values ($1,$2,'good')`, [U, today]), /mind limit/);
  // 10 + 28 + 10 + goal 20 = 68
  assert.deepEqual(await points(), { sleep: 10, meal: 28, mind: 10, goal: 20, total: 68 });

  // can't write far-off dates
  await assert.rejects(
    q(`insert into public.meal_records(user_id,log_date,slot,status) values ($1,$2::date - 5,0,'ate')`, [U, today]),
    /invalid date/
  );

  // evolution: 68 >= 60 -> Lv.4, once a day
  let r = await sync();
  assert.deepEqual([r.total, r.level, r.evolved, r.today.total], [68, 4, true, 68]);
  r = await sync();
  assert.deepEqual([r.level, r.evolved], [4, false]);

  // enough for Lv.5 already, but only one evolution per day; next day it evolves, never skips
  await q(`update public.profiles set last_evolved_date = $2::date - 1 where id=$1`, [U, today]);
  await q(`insert into public.sleep_records(user_id,log_date,bed_time,wake_time) values ($1,$2::date - 1,'22:00','07:00')`, [U, today]);
  await q(`insert into public.meal_records(user_id,log_date,slot,status)
           select $1, $2::date - 1, s, 'ate' from generate_series(0,5) s`, [U, today]);
  await q(`insert into public.mind_records(user_id,log_date,emotion,note) values ($1,$2::date - 1,'okay','그냥')`, [U, today]);
  assert.equal((await points(`${today}`)).total, 68);
  r = await sync();
  assert.equal(r.total, 68 + 100); // yesterday capped at 100
  assert.deepEqual([r.level, r.evolved], [5, true]);
  r = await sync();
  assert.deepEqual([r.level, r.evolved], [5, false]);

  // deleting records lowers points but never the level
  await q(`delete from public.meal_records where user_id=$1`, [U]);
  r = await sync();
  assert.ok(r.total < 140);
  assert.equal(r.level, 5);

  await db.exec(`select set_config('test.uid', '', false)`);
  await assert.rejects(q(`select public.sync_growth($1::date)`, [today]), /not authenticated/);
  await db.close();
});
