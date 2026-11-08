import { PGlite } from '@electric-sql/pglite';
// Runs schema.sql + 002 + 004 + 005 + 006 in PGlite and checks growth points (003 needs Supabase Storage).
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
  for (const f of ['schema.sql', '002_game_rpc.sql', '004_birth_year.sql', '005_growth.sql', '005_growth.sql', '006_day_detail.sql', '006_day_detail.sql', '009_slow_growth.sql', '009_slow_growth.sql', '011_daily_diary_and_sleep_rhythm.sql', '011_daily_diary_and_sleep_rhythm.sql', '012_hundred_days.sql', '012_hundred_days.sql', '013_stage_one.sql', '013_stage_one.sql']) {
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
  assert.equal((await points()).sleep, 24); // duration is enough, but 23:00 is late for this band
  await q(`update public.sleep_records set bed_time='20:00', wake_time='05:30' where user_id=$1`, [U]);
  assert.equal((await points()).sleep, 30);
  await setYear(year - 15);
  assert.equal((await points()).sleep, 24); // enough duration, but 20:00 is earlier than the teen window
  await q(`update public.sleep_records set bed_time='21:30', wake_time='07:00' where user_id=$1`, [U]);
  assert.equal((await points()).sleep, 30);
  await q(`update public.sleep_records set bed_time='01:00', wake_time='06:30' where user_id=$1`, [U]); // 5.5h
  assert.equal((await points()).sleep, 10);

  // meals: only eaten slots count (ate/much/little/hard), 3 eaten -> 28
  await db.exec(sql('014_meal_much.sql'));
  for (const [slot, status] of [[0, 'much'], [2, 'little'], [4, 'hard'], [1, 'skipped'], [5, 'no_answer']]) {
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

  // New pets hatch at stage 1 and need 100 points for stage 2.
  let r = await sync();
  assert.deepEqual([r.total, r.level, r.evolved, r.today.total], [68, 1, false, 68]);

  // Complete today: sleep 30 + six meals 40 + mind 10 + observation goal 20 = 100.
  await q(`update public.sleep_records set bed_time='21:30', wake_time='05:30' where user_id=$1 and log_date=$2`, [U, today]);
  await q(`delete from public.meal_records where user_id=$1 and log_date=$2 and slot in (1,5)`, [U, today]);
  for (const slot of [0, 1, 2, 3, 4, 5]) {
    await q(`insert into public.meal_records(user_id,log_date,slot,status) values ($1,$2,$3,'ate')
             on conflict (user_id,log_date,slot) do update set status='ate'`, [U, today, slot]);
  }
  assert.equal((await points()).total, 100);
  r = await sync();
  assert.deepEqual([r.total, r.level, r.evolved], [100, 2, true]);

  // Four more complete days reach 500, but a pet grows at most one stage a day.
  await db.exec(`set session_replication_role = replica`); // past days are refused by check_record_write
  for (const back of [1, 2, 3, 4]) {
    await q(`insert into public.sleep_records(user_id,log_date,bed_time,wake_time) values ($1,$2::date - $3::int,'21:30','05:30')`, [U, today, back]);
    await q(`insert into public.meal_records(user_id,log_date,slot,status)
             select $1, $2::date - $3::int, s, 'ate' from generate_series(0,5) s`, [U, today, back]);
    await q(`insert into public.mind_records(user_id,log_date,emotion,situation,note)
             values ($1,$2::date - $3::int,'okay','school','괜찮은 하루')`, [U, today, back]);
  }
  await db.exec(`set session_replication_role = origin`);
  r = await sync();
  assert.deepEqual([r.total, r.level, r.evolved], [500, 2, false]);
  const nextDay = () => q(`update public.profiles set last_evolved_date = $2::date - 1 where id=$1`, [U, today]);
  await nextDay(); r = await sync();
  assert.deepEqual([r.level, r.evolved], [3, true]);
  await nextDay(); r = await sync();
  assert.deepEqual([r.level, r.evolved], [4, true]);
  await nextDay(); r = await sync();
  assert.deepEqual([r.level, r.evolved], [4, false]); // stage 5 needs 1800

  // deleting records lowers points but never the level
  await q(`delete from public.meal_records where user_id=$1`, [U]);
  r = await sync();
  assert.ok(r.total < 500);
  assert.equal(r.level, 4);

  // ---------- small goals (second user, observe_days = 1) ----------
  const V = '22222222-2222-2222-2222-222222222222';
  await db.query(`insert into auth.users values ($1,'v@b.c','{}')`, [V]);
  await db.exec(`select set_config('test.uid', '${V}', false)`);
  const goal = async () => (await q(`select public.get_small_goal($1::date) r`, [today]))[0].r;
  const goalPts = async () => (await q(`select goal from public.day_points($1, $2::date)`, [V, today]))[0].goal;
  const meal = (day, slot, status = 'ate') =>
    q(`insert into public.meal_records(user_id,log_date,slot,status) values ($1,$2::date + $3::integer,$4,$5)`, [V, today, day, slot, status]);

  // first day: observing, goal = areas rule
  await meal(0, 0);
  let g = await goal();
  assert.deepEqual([g.day, g.observing, g.goal, g.points], [1, true, null, 10]);

  // with a record yesterday, today is day 2: suggestion from yesterday (1 meal < 3 -> more_meal)
  await meal(-1, 0);
  g = await goal();
  assert.deepEqual([g.day, g.observing, g.suggestion, g.yesterday.eaten, g.needs_prompt], [2, false, 'more_meal', 1, true]);
  assert.equal(await goalPts(), 10); // no goal picked yet -> observe rule

  // more_meal: yesterday 1 eaten; today 1 -> partial 10, 2 -> complete 20
  await q(`insert into public.small_goals(user_id,log_date,kind) values ($1,$2,'more_meal')`, [V, today]);
  assert.equal(await goalPts(), 10);
  await meal(0, 2);
  assert.equal(await goalPts(), 20);

  // holding falls back to the observe rule (1 area -> 10), never below
  await q(`update public.small_goals set held = true where user_id=$1`, [V]);
  assert.equal(await goalPts(), 10);

  // earlier_bed 30 min: yesterday 00:30; today 00:15 -> half (10); 00:00 -> 20; 01:00 -> tried (5)
  await q(`update public.small_goals set held = false, kind='earlier_bed', size=30 where user_id=$1`, [V]);
  assert.equal(await goalPts(), 0); // no sleep record today
  await q(`insert into public.sleep_records(user_id,log_date,bed_time,wake_time) values ($1,$2::date - 1,'00:30','08:00')`, [V, today]);
  await q(`insert into public.sleep_records(user_id,log_date,bed_time,wake_time) values ($1,$2,'00:15','08:00')`, [V, today]);
  assert.equal(await goalPts(), 10);
  await q(`update public.sleep_records set bed_time='23:55' where user_id=$1 and log_date=$2`, [V, today]);
  assert.equal(await goalPts(), 20); // before midnight counts as earlier
  await q(`update public.sleep_records set bed_time='01:00' where user_id=$1 and log_date=$2`, [V, today]);
  assert.equal(await goalPts(), 5);

  // mind_reason: emotion only 5, situation or note 10, both 20
  await q(`update public.small_goals set kind='mind_reason', size=1 where user_id=$1`, [V]);
  assert.equal(await goalPts(), 0);
  await q(`insert into public.mind_records(user_id,log_date,emotion) values ($1,$2,'okay')`, [V, today]);
  assert.equal(await goalPts(), 5);
  await q(`insert into public.mind_records(user_id,log_date,emotion,situation) values ($1,$2,'tired','school')`, [V, today]);
  assert.equal(await goalPts(), 10);
  await q(`insert into public.mind_records(user_id,log_date,emotion,situation,note) values ($1,$2,'tired','family','다퉜어')`, [V, today]);
  assert.equal(await goalPts(), 20);

  // day detail and journey summary for this user
  const day = (await q(`select public.get_day_points($1::date) r`, [today]))[0].r;
  assert.deepEqual([day.goal, day.small_goal.kind], [20, 'mind_reason']);
  await q(`update public.profiles set reflection = '조금 덜 불안해졌어' where id=$1`, [V]);
  const j = (await q(`select public.get_journey() r`))[0].r;
  assert.deepEqual(
    [j.recorded_days, j.sleep_count, j.meal_count, j.mind_count, j.goals_done, j.reflection],
    [2, 2, 3, 3, 1, '조금 덜 불안해졌어']
  );
  assert.equal(j.level, 1);

  // get_journey counts only the current 100 days
  await q(`update public.profiles set journey_start = $2::date + 1 where id=$1`, [V, today]);
  assert.equal((await q(`select public.get_journey() r`))[0].r.recorded_days, 0);
  await q(`update public.profiles set journey_start = null where id=$1`, [V]);

  // daily diary is one auto-saved entry per date and keeps text within the app limit
  await q(`insert into public.daily_reflections(user_id,log_date,text) values ($1,$2,'오늘은 한 끼를 더 챙겼다')`, [V, today]);
  await q(`insert into public.daily_reflections(user_id,log_date,text) values ($1,$2,'고쳐 쓴 일기')
           on conflict (user_id,log_date) do update set text=excluded.text`, [V, today]);
  assert.equal((await q(`select text from public.daily_reflections where user_id=$1`, [V]))[0].text, '고쳐 쓴 일기');
  await assert.rejects(
    q(`update public.daily_reflections set text=repeat('가',2001) where user_id=$1`, [V]),
    /daily_reflections_text_check/
  );

  await db.exec(`select set_config('test.uid', '', false)`);
  await assert.rejects(q(`select public.sync_growth($1::date)`, [today]), /not authenticated/);
  await db.close();
});
