import { PGlite } from '@electric-sql/pglite';
// Runs supabase/*.sql against an in-memory Postgres (PGlite) with a minimal
// stand-in for Supabase's auth schema, and checks the game RPCs.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const sql = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('game RPCs: ensure_profile, close_days, buy_item', async () => {
const [schema1, schema2] = [sql('schema.sql'), sql('002_game_rpc.sql')];
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
`);
await db.exec(schema1);
await db.exec(schema2);
await db.exec(schema2); // idempotent re-run
const U = '11111111-1111-1111-1111-111111111111';
const q = async (sql, p=[]) => (await db.query(sql, p)).rows;
const asUser = (uid) => db.exec(`select set_config('test.uid', '${uid}', false)`);
const today = (await q(`select (now() at time zone 'utc')::date::text d`))[0].d;
const rpc = async (sql, p) => (await q(sql, p))[0].r;
const close = () => rpc(`select public.close_days($1::date) r`, [today]);
const setProfile = (cols) => q(`update public.profiles set ${cols} where id=$1`, [U]);

// signup trigger creates profile; ensure_profile is a no-op then
await db.query(`insert into auth.users values ($1,'a@b.c','{"nickname":"새길"}')`, [U]);
await asUser(U);
await q(`select public.ensure_profile()`);
let p = (await q(`select * from public.profiles where id=$1`, [U]))[0];
assert.equal(p.nickname, '새길'); assert.equal(p.jelly_balance, 50);

// ensure_profile creates a missing row (pre-v1 signup)
await q(`delete from public.profiles where id=$1`, [U]);
await q(`select public.ensure_profile()`);
assert.equal((await q(`select count(*)::int c from public.profiles`))[0].c, 1);

// first use stamps today
let r = await close();
assert.equal(r.days_passed, 0); assert.equal(r.last_checkin_date, today);

// same day again: nothing
r = await close(); assert.equal(r.days_passed, 0); assert.equal(r.streak, 0);

// logged yesterday -> streak 3, reward 15
await setProfile(`streak=2, last_checkin_date='${today}'::date-1`);
await q(`insert into public.daily_logs(user_id,log_date,meal_count,daily_score) values ($1,'${today}'::date-1,1,77)`, [U]);
r = await close();
assert.deepEqual([r.days_passed, r.streak, r.rewarded_jelly, r.jelly_balance], [1, 3, 15, 65]);
assert.deepEqual(r.history_scores, [50,50,50,77]);

// logged 3 days ago, skipped 2 days, 1 shield -> shield used, then reset
await setProfile(`streak=5, shields=1, jelly_balance=0, last_checkin_date='${today}'::date-3, history_scores='{1,2,3,4,5,6,7}'`);
await q(`insert into public.daily_logs(user_id,log_date,emotion,daily_score) values ($1,'${today}'::date-3,80,90)`, [U]);
r = await close();
assert.deepEqual([r.days_passed, r.missed_days, r.shields_used, r.streak_reset, r.streak, r.shields, r.rewarded_jelly],
                 [3, 2, 1, true, 0, 0, 20]);
assert.deepEqual(r.history_scores, [4,5,6,7,90,40,40]);

await q(`delete from public.daily_logs`);
// shield earned on day 7
await setProfile(`streak=6, shields=0, last_checkin_date='${today}'::date-1`);
await q(`insert into public.daily_logs(user_id,log_date,sleep_hours) values ($1,'${today}'::date-1,7)`, [U]);
r = await close(); assert.equal(r.streak, 7); assert.equal(r.shield_earned, true); assert.equal(r.shields, 1);

// date out of range rejected
await assert.rejects(rpc(`select public.close_days($1::date + 5) r`, [today]), /invalid date/);

// buy_item
await setProfile(`jelly_balance=45`);
r = await rpc(`select public.buy_item('costume','glasses') r`);
assert.equal(r.jelly_balance, 5);
await assert.rejects(rpc(`select public.buy_item('costume','glasses') r`), /already owned/);
await assert.rejects(rpc(`select public.buy_item('costume','crown') r`), /insufficient jelly/);
await assert.rejects(rpc(`select public.buy_item('costume','nope') r`), /item not found/);
assert.equal((await q(`select count(*)::int c from public.user_items`))[0].c, 1);

// ---------- backfill_yesterday (S25) ----------
const backfill = (score = 80, meals = 2) =>
  rpc(`select public.backfill_yesterday($1::date, 7, 0, $2::smallint, 0::smallint, 80::smallint, $3::smallint) r`,
      [today, meals, score]);
await q(`delete from public.daily_logs`);

// streak 4, no shield, nothing logged yesterday -> reset to 0, but backfillable
await setProfile(`streak=4, shields=0, jelly_balance=30, last_checkin_date='${today}'::date-1, history_scores='{50,60}'`);
r = await close();
assert.equal(r.streak, 0);
p = (await q(`select * from public.profiles where id=$1`, [U]))[0];
assert.equal(p.missed_prev_streak, 4); assert.equal(p.missed_used_shield, false);
r = await backfill(85);
assert.deepEqual([r.streak, r.shields, r.jelly_balance, r.shield_refunded], [5, 0, 10, false]);
p = (await q(`select * from public.profiles where id=$1`, [U]))[0];
assert.deepEqual(p.history_scores, [50, 60, 85]);
assert.equal(p.missed_date, null);
let y = (await q(`select * from public.daily_logs where user_id=$1 and log_date='${today}'::date-1`, [U]))[0];
assert.equal(y.meal_count, 2); assert.equal(y.daily_score, 85);
// only once
await assert.rejects(backfill(), /nothing to backfill/);

// shield was used yesterday -> refunded, streak continues
await setProfile(`streak=6, shields=1, jelly_balance=20, last_checkin_date='${today}'::date-1`);
await q(`delete from public.daily_logs`);
r = await close();
assert.deepEqual([r.streak, r.shields], [6, 0]);
r = await backfill();
assert.deepEqual([r.streak, r.shields, r.jelly_balance, r.shield_refunded], [7, 1, 0, true]);

// skipped several days: only the last one (yesterday) is backfillable
await setProfile(`streak=3, shields=0, jelly_balance=50, last_checkin_date='${today}'::date-3`);
r = await close();
assert.equal(r.streak, 0);
r = await backfill();
assert.equal(r.streak, 1);

// yesterday was logged -> nothing to backfill; not enough jelly; empty input
await setProfile(`streak=1, shields=0, jelly_balance=50, last_checkin_date='${today}'::date-1`);
await q(`insert into public.daily_logs(user_id,log_date,meal_count) values ($1,'${today}'::date-1,1) on conflict (user_id,log_date) do update set meal_count=1`, [U]);
await close();
await assert.rejects(backfill(), /nothing to backfill/);
await q(`delete from public.daily_logs`);
await setProfile(`streak=2, shields=0, jelly_balance=5, last_checkin_date='${today}'::date-1`);
await close();
await assert.rejects(backfill(), /insufficient jelly/);
await setProfile(`jelly_balance=50`);
await assert.rejects(
  rpc(`select public.backfill_yesterday($1::date, null, null, 0::smallint, 0::smallint, null, 40::smallint) r`, [today]),
  /empty backfill/
);

// clients cannot write the backfill bookkeeping columns
const grants = await q(`select column_name from information_schema.column_privileges
  where table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE'`);
assert.ok(!grants.some((g) => g.column_name.startsWith('missed_')));

// ---------- daily quests (S70) ----------
const quests = () => rpc(`select public.get_daily_quests($1::date) r`, [today]);
const claim = (id) => rpc(`select public.claim_quest($1::date, $2) r`, [today, id]);
await q(`delete from public.daily_logs`);
await setProfile(`jelly_balance=0, target_meals=3, last_checkin_date='${today}'`);

let qs = await quests();
assert.deepEqual(qs.map((x) => x.tier), [1, 2, 3]);
assert.ok(qs.every((x) => x.progress === 0 && !x.claimed));
// rotates daily: tomorrow's set differs from today's
const tomorrowIds = (await q(`select public.daily_quest_ids($1::date + 1) r`, [today]))[0].r;
assert.notDeepEqual(tomorrowIds, qs.map((x) => x.id));

await assert.rejects(claim(qs[0].id), /quest not complete/);
await assert.rejects(claim('no_such_quest'), /not today's quest/);

// a day that completes every quest in the pool
await q(`insert into public.daily_logs(user_id,log_date,sleep_hours,sleep_diff,meal_count,bad_meal_count,emotion,daily_score)
         values ($1,$2::date,7,0,3,0,80,90)`, [U, today]);
qs = await quests();
assert.ok(qs.every((x) => x.progress === x.target));
r = await claim(qs[0].id);
assert.deepEqual(r, { reward: 5, jelly_balance: 5 });
await assert.rejects(claim(qs[0].id), /already claimed/);
r = await claim(qs[1].id); assert.equal(r.jelly_balance, 15);
r = await claim(qs[2].id); assert.equal(r.jelly_balance, 30);
assert.ok((await quests()).every((x) => x.claimed));

// every quest in the pool has a progress rule
for (const { id } of await q(`select id from public.quest_defs`)) {
  await q(`select * from public.quest_progress($1, $2::date, $3)`, [U, today, id]);
}

// unauthenticated
await asUser('');
await assert.rejects(close(), /not authenticated/);
await db.close();
});
