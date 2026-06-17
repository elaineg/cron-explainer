```
clarity: Yes
value: Yes
advocacy: 9
priorConcernsAddressed: some
```

# Round 2 — Tester 2 (Marcus, frontend eng, 2yr)

## Prior concerns, re-checked
- **Thin NL coverage — FIXED.** Every phrase I called out now parses correctly:
  - `noon every day` → `0 12 * * *`
  - `every 30 minutes` → `*/30 * * * *`
  - `quarterly` → `0 0 1 1,4,7,10 *` (verified via API: Jan/Apr/Jul/Oct 1st midnight — correct)
  - `first of the month at 9am` → `0 9 1 * *`
  - `9am every monday` → `0 9 * * 1`
  - Bonus: they surfaced these as clickable example chips under the input, so discovery of what-it-can-do is way better.
- **Stale output on parse failure — PARTIALLY fixed.** There's now a clear amber banner ("Couldn't read that schedule. Try one of the examples below.") + the input border turns amber. Good — no more silent false success at the banner level. BUT the cron field, the "IN PLAIN ENGLISH" card, and the "NEXT 5 RUNS" card all STILL show the previous valid result (`0 0 * * 0`). The Copy button still copies the stale value. A rushed user can still grab a wrong expression.

## Fresh take
- Clarity: still instant. h1 + subtitle nail it in 3s.
- Value vs crontab.guru: still Yes — reverse English→cron is the differentiator, and coverage now holds up to real typing instead of bouncing half my tries. Next-5-runs in my TZ + clean JSON API + permalinks remain things crontab.guru lacks.
- No console errors; CSS clean.

## Biggest remaining holdback
The failure state is half-done: the warning is loud, but the result blocks below it keep rendering the last good schedule. Either grey out / clear the cron field + result cards on failure, or disable Copy. Fix that and it's a clean 10 I'd push in Slack.
