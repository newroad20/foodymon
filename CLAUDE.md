# 푸디몬 (Foody-Mon)

Expo + Supabase app where daily sleep / meal / emotion check-ins raise a pet ("푸디몬").
Read `AGENTS.md` too — it has the Expo rules (check the SDK 57 docs, `npx expo install`, etc.).

## Working with the owner

- The owner is new to coding and GitHub. Reply in Korean, explain steps plainly, and give
  click-by-click instructions for anything they must do themselves (Supabase dashboard, Expo Go).
- Every change goes through a branch + PR on `newroad20/foodymon`; the owner reviews and merges.
- Supabase SQL is never applied automatically. When a PR adds SQL, tell the owner to run it in the
  Supabase dashboard → SQL Editor **before** merging, and say so in the PR description.
- The owner tests on a phone with Expo Go (`npx expo start`, scan the QR). Claude cannot log in to
  the app, so on-device checks are listed in each PR for the owner.

## Commands

```bash
npx expo start          # dev server (add -c after installing packages)
npm test                # node:test — src/**/*.test.ts and supabase/tests/*.test.mjs (SQL via PGlite)
npx tsc --noEmit        # typecheck
npx expo export --platform ios --output-dir <tmp>   # bundle check
```

## Architecture

- Routes (`src/app/`): `(tabs)/` = 홈 `index`, 요약 `summary`, 마이 `mypage`; stack screens
  `collection` (도감) and `share` (자랑하기). Logged-out users see `components/auth/*` instead.
- `src/context/FoodyMonContext.tsx` holds the game state. The server is the source of truth;
  AsyncStorage is only a per-account cache. UI updates first, then saves.
- `src/lib/gameApi.ts` = all Supabase calls. Pure logic (testable with plain Node) lives in
  `src/lib/{score,dayRollover,serverState,trend,collection,authLink,dialogue}.ts`; those files use explicit
  `.ts` relative imports so `node --test` can load them.
- Anti-cheat: jelly, streak, shields and purchases change only through security-definer RPCs in
  `supabase/002_game_rpc.sql` (`ensure_profile`, `close_days`, `buy_item`). Clients may write
  `daily_logs`, `checkin_logs`, and a few `profiles` columns (see grants in `supabase/schema.sql`).
- Growth (재형 feedback, 2026-10): records live in `sleep_records` / `meal_records` (6 slots) /
  `mind_records` (3 a day); `day_points` scores a day (sleep 30 + meal 40 + mind 10 + goal 20, max 100;
  every feeling scores the same) and `sync_growth` evolves `profiles.evolution_stage` 1→6 at 100/250/500/1800/4000
  cumulative points, once a day, never down (`supabase/013_stage_one.sql`; pets made before it hatched at 3). The journey lasts 100 calendar days
  from `profiles.journey_start` (`lib/journey.ts`); after that home shows `JourneyComplete` and recording stops until a new start. `src/lib/growth.ts` mirrors it
  for the UI — keep both in sync. `daily_logs` is still written (derived totals) for streak/jelly.
  Small goals (`small_goals`, `goal_points`, `get_small_goal`, home `GoalCard`) replaced the S70 daily
  quests in the app; observation days = `observe_days()` (pilot 1, release 7).
- Day rollover runs on the server (`close_days`), triggered on launch / foreground / every minute.
  Its rules mirror `closeDay` in `src/lib/dayRollover.ts` — keep both in sync.
- No calorie or weight fields anywhere (product principle noted in `schema.sql`).

## Status and next steps

Done: auth (email confirmation deep link), onboarding, check-ins, daily rollover, server sync,
tabs (홈 / 요약 / 마이), My Page, daily summary + trend chart, collection (C1–C3), share card (S5-3),
S25 backfill (20 jelly, yesterday only; `BACKFILL_COST` must match `backfill_yesterday`),
S70 daily quests (Duolingo-style, 3 a day, 5/10/15 jelly; `get_daily_quests` / `claim_quest`),
Roblox-style dressroom (`src/app/dressroom.tsx`), app icon/splash, EAS Android preview builds.
Also: background music (`MusicContext`, toggle on My Page), situational pet dialogue
(`lib/dialogue.ts`), daily local reminders 9:00/20:00 (`lib/reminders.ts`), egg hatch at the end of
onboarding (`HatchEgg`), streak milestone jelly 3/7/14/every 30 days (`streak_milestone_bonus`, mirrored
in `dayRollover.ts`), gift box gacha (`open_gift_box`, `GIFT_BOX_COST` = 30, unowned items only),
meal type 아침/점심/저녁/간식 (stored in the check-in log text only).

Product direction (keep consistent):
- World: "감각의 숲". FoodyMon grows on what the user notices (food colour/texture/gratitude,
  sleep, mood); jelly = forest dew. Story and tutorial copy live in `src/constants/foodymonData.ts`.
- It is an emotional-support app: never blame, grade or compare the user in copy
  (no "과식/결식/잘 못했어요/슬퍼할 거예요"). Low days get company, not warnings.
  Meal score counts logged meals only; portion size never lowers it (PR #24).
- Look: Duolingo / Pou / Roblox game feel — mint `#1B7F66` accent (white text 4.9:1), pale mint
  `#F2F8F4` background on every screen (pink dropped 2026-11), cards with a 2px border + 4px bottom edge, Ionicons instead of emoji in
  UI chrome, system font one weight heavier (Nunito was dropped: no Hangul).

Open items:
- Stage art 1–2 is the team's (2026-11); faces/costumes for 1–2 are generated by `scripts/pet-faces.py` and
  `scripts/pet-costume-transfer.py` (costumes copied from level 3).
- Before launch: custom SMTP (e.g. Resend) in Supabase, turn "Confirm email" back on; iOS needs an
  Apple Developer account for test builds.
- When copying SQL with Korean to the clipboard use `LANG=en_US.UTF-8 pbcopy` (bare pbcopy
  garbled the quest titles once).
- App flow reference: `../푸디몬 플로우 정리.png` and `../SETUP_foodymon.md` (outside this repo).
