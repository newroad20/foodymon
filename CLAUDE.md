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
  `src/lib/{score,dayRollover,serverState,trend,collection,authLink}.ts`; those files use explicit
  `.ts` relative imports so `node --test` can load them.
- Anti-cheat: jelly, streak, shields and purchases change only through security-definer RPCs in
  `supabase/002_game_rpc.sql` (`ensure_profile`, `close_days`, `buy_item`). Clients may write
  `daily_logs`, `checkin_logs`, and a few `profiles` columns (see grants in `supabase/schema.sql`).
- Day rollover runs on the server (`close_days`), triggered on launch / foreground / every minute.
  Its rules mirror `closeDay` in `src/lib/dayRollover.ts` — keep both in sync.
- No calorie or weight fields anywhere (product principle noted in `schema.sql`).

## Status and next steps

Done: auth (email confirmation deep link), onboarding, check-ins, daily rollover, server sync,
shop, tabs, My Page, daily summary + trend chart, collection (C1–C3), share card (S5-3),
S25 backfill (20 jelly, yesterday only: restores the streak and refunds a shield used that day;
`backfill_yesterday` RPC, `BACKFILL_COST` must match it).

Open items:
- S70 퀘스트 — not specified in the flow doc.
- Before launch: connect custom SMTP (e.g. Resend) in Supabase and turn "Confirm email" back on
  (it is off for development because the default mailer only sends to team members, 2/hour).
- App flow reference: `../푸디몬 플로우 정리.png` and `../SETUP_foodymon.md` (outside this repo).
