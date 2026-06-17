```
clarity: Yes
value: Yes
advocacy: 8
```

# Round 1 — Tester 1 (Priya, senior backend SWE, desktop/keyboard-first)

**Task:** sanity-check a teammate's PR CronJob `*/15 9-17 * * 1-5` before approving, in my own TZ.

## Clarity — Yes
- Headline "Cron Explainer" + subtitle "Paste a cron expression and see what it means in plain English, plus its next 5 run times" tells me exactly what it is in <5s. No signup, no chrome. Good.

## Value — Yes (would use over crontab.guru)
- Pasted `*/15 9-17 * * 1-5` → "Every 15 minutes, between 09:00 AM and 05:59 PM, Monday through Friday". Correct. The `05:59 PM` detail (not 5pm) is exactly the at-a-glance precision I needed to approve.
- Killer feature vs crontab.guru: **NEXT 5 RUNS labeled "(your timezone: America/Los_Angeles)"** with relative "in 3 days". crontab.guru shows UTC-ish next runs; here I don't do the TZ math in my head. This alone wins my use.
- English→cron works: "every weekday at 9am" → `0 9 * * 1-5`. `MON-FRI` and `@daily` aliases both parse.
- Invalid input handled cleanly: `99 * * * *` → "Not a valid cron expression: minutes part must be >= 0 and <= 59". Specific, not a generic fail.
- API is honest: `/api/explain?expr=` returns UTC ISO in JSON, UI localizes. Correct separation.

## What annoys me / holds back advocacy
- **No permalink / no shareable URL.** `?expr=0+0+*+*+0` is ignored — the box stays at the default. I can't drop a link in the PR comment so my teammate sees the same explanation. For a PR-review tool this is the #1 miss.
- **No copy button** on the generated cron expression (`button` count = 0). After typing English I have to hand-select `0 9 * * 1-5`. Minor but it's a keyboard-first papercut.
- Nit: no field-level highlight showing which of the 5 cron fields maps to which clause — crontab.guru's hover breakdown is something I'd miss for gnarlier expressions.

**Single biggest blocker to a 9/10:** no permalink to paste into a PR review — the exact workflow this tool is perfect for. Add `?expr=` deep-linking + a copy button and it's a 9.
