PASS

Run: 20260617-153950-daily — fresh-context re-verification after panel round 1 fixes.
Server: http://localhost:3210 (bin/serve-local, chunk-200 gate passed, 10 chunks all 200).
Spec: apps/cron-explainer/APP_SPEC.md

## Counts

Unit tests (vitest): 145 run / 145 passed (4 files)
E2E tests (playwright, localhost:3210): 111 run / 111 passed (6 files, 0 failed)

## Fix 1 — UTC/Local toggle reconverts (same instants, two display zones)

Spec: Local view and UTC view must show the SAME UTC instants displayed in two different zones.

Evidence:
- `GET /api/explain?expr=0%206%20*%20*%20*&tz=America%2FNew_York` → all 5 next at T10:00:00Z (06:00 EDT = UTC-4)
- `GET /api/explain?expr=0%206%20*%20*%20*&tz=UTC` → all 5 next at T06:00:00Z
- Difference between first timestamps: exactly 14400000ms (4h EDT offset) — confirmed DIFFERENT instants, not relabeling
- Code audit: explainer.tsx line 229 `const evalTz = localTz` fixes evaluation in browser tz; toggle only changes `displayTz` passed to `formatAbsolute`. The `Date` objects (UTC instants) are never recalculated on toggle.
- Unit suite: "BLOCKER-1 regression" block (cron.test.ts lines 539-581, 3 tests) — all pass
- E2E: verify-fixes.spec.ts "Fix 1" block (4 tests) — all pass

Specific API assertion: `0 6 * * *` with `tz=America/New_York` → T10:00:00Z confirmed. UTC display shows 10:00, local (NY) display shows 06:00 AM — same instant, two zones. PASS.

## Fix 2 — 6-field Quartz with trailing ? detects Quartz (not AWS)

Spec: `0 0 12 * * ?` → Quartz, description = noon (12:00 PM). NOT "day 12" / AWS.

Evidence:
- `GET http://localhost:3210/api/explain?expr=0%200%2012%20*%20*%20%3F` → HTTP 200, `{"description":"At 12:00 PM","next":["2026-06-18T12:00:00.000Z",...]}` — noon confirmed, not "on day 12"
- Logic (cron.ts line 173): `hasAwsDayQuestionMark` checks only fields[2] and fields[4]. For `0 0 12 * * ?`, `?` is at index 5 (Quartz dow position), NOT at 2 or 4 → `hasAwsDayQuestionMark = false` → falls through to Quartz default. Correct.
- UI: Quartz badge active, AWS badge inactive for `0 0 12 * * ?` (e2e confirmed)

Regression still-hold checks (all pass via API + e2e):
- `0 9 ? * MON-FRI *` → AWS, weekday 09:00 (? at index 2 = AWS dom position)
- `0 0 9 ? * MON-FRI` → Quartz, weekday 09:00 (last field = DOW token)
- `*/30 * * * * *` → Quartz, 30s spacing (no ? in AWS day positions)

Unit tests: "BLOCKER-2 regression" block (cron.test.ts lines 506-537, 5 tests) — all pass
E2E: verify-fixes.spec.ts "Fix 2" (5 tests), dialect.spec.ts "BLOCKER-2" (2 tests) — all pass

## Fix 3 — Translate output visible + labeled

Spec: clicking translate-to target shows "Translated to <Dialect>:" header, expression, Copy(✓) flash, "Use in input" button; sub-minute→Unix shows amber note.

Evidence (verify-fixes.spec.ts "Fix 3" block, 6 tests, all pass):
1. `0 9 * * 1-5` → Translate to Quartz: `[data-testid="translate-result"]` visible, contains "Translated to Quartz", expression element has 6-field Quartz with leading "0" seconds.
2. "Use in input" button writes Quartz expression to cron input (6 fields confirmed by input value check).
3. Copy button shows `✓ Copied!` after click (clipboard-write permission granted in test).
4. Copy flash still present at 800ms post-click (1500ms window not yet elapsed — tested in live ticking page).
5. `*/30 * * * * *` → Translate to Unix: panel shows "Translated to Unix" label, `[data-testid="translate-warning"]` visible, text contains "sub-minute".
6. Panel is in-viewport after smooth scroll (getBoundingClientRect verified within 200px of fold).

Also confirmed: dialect.spec.ts "BLOCKER-3" block (4 tests) — Translate panel visible, labeled, Use-in-input works, sub-minute warning in panel.

## Full regression — spec success checks

All pass against localhost:3210 (111 e2e, 145 unit):
- Home page: prefilled example, description non-empty, 5 run times on cold load.
- `0 9 * * MON-FRI`: weekday 9:00 description + 5 weekday runs.
- `@daily`: midnight description, 5 daily runs.
- `61 * * * *` + `a b c d e f g h`: inline error, no crash, clears on valid input.
- Quartz seconds `*/30 * * * * *`: 30s spacing honored.
- Quartz 7-field `0 0 12 ? * MON 2027`: all 5 runs in 2027 on Mondays at 12:00Z.
- Quartz 7-field `0 0 12 1 1 ? 2030`: 1 run in 2030, Jan 1, 12:00Z.
- Past year `0 0 12 ? * MON 2020`: empty next, yearNote with "past".
- AWS `cron(0 10 * * ? *)`: wrapper accepted, 10:00 AM description.
- Auto-detect + override: 6-field defaults Quartz; AWS button re-explains under AWS.
- Translate Unix→Quartz round-trip: weekday 9am meaning preserved.
- API `/api/explain?expr=banana` → 400; `*/10%20*%20*%20*%20*` → 200, 10-min spacing.
- API invalid tz → 400; absent tz → UTC; `tz=America/New_York` → shifted instants.
- Permalinks: `/e/<expr>`, `?expr=`, `?cron=` all prefill + show results. `/e/banana` → error, no 500.
- English: `every weekday at 9am` → `0 9 * * 1-5`; unsupported phrase → can't-understand msg.
- Stale output cleared on error (both cron error and English error).
- Copy buttons (cron + permalink) both show `✓ Copied!` confirmation.
- Static chunk: homepage 200, /_next/static chunk 200 (chunk-200 gate passed).

## Vercel smoke (minimal — prod ship happens after panel passes)

Note: Vercel prod URL (https://cron-explainer-xi.vercel.app) is a STALE deployment predating
all dialect fixes. It returns 400 for `0 0 12 * * ?` (expected — old build). Local production
build (same `next build` + `next start`) has all fixes applied and passes all 111 e2e tests.
- Homepage: 200
- `/e/0%209%20*%20*%20MON-FRI`: 200
- `/api/explain?expr=0%209%20*%20*%20*` (5-field basic): 200, correct UTC next times
