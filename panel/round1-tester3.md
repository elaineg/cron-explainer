```
clarity: Yes
value: Marginal
advocacy: 5
```

# Tester 3 — Wen (marketing data analyst, dbt/Airflow cron) — Round 1

## 1. CLARITY — Yes
- Title "Cron Explainer" + subhead "Paste a cron expression and see what it means in plain English, plus its next 5 run times" told me exactly what it does in ~3s.
- Bidirectional (cron->English and English->cron) is obvious from the second input. Good.

## 2. VALUE — Marginal
- Today I use crontab.guru + manual UTC->PT mental math (subtract 7h) to sanity-check `0 6 * * *` before a stakeholder asks why a dashboard is stale.
- The win I wanted is here: "NEXT 5 RUNS (your timezone: America/Los_Angeles)" — tz is LABELED and the browser render uses MY local tz. crontab.guru doesn't localize. That's genuinely useful.
- English descriptions are correct: `0 9-17/2 * * 1-5` -> "On the hour, every 2 hours, between 09:00 AM and 05:00 PM, Monday through Friday". Steps/ranges/macros all right. Invalid input gives precise errors ("it has 3 fields", "minutes part must be >= 0 and <= 59", HTTP 400). Clean.
- BUT the data hygiene is broken, and that's my whole job: the API `next[]` is INTERNALLY INCONSISTENT with the UI.
  - UI for `0 6 * * *` (LA): "Sat, Jun 13, 06:00 AM" (local wall-clock).
  - API for same: `"2026-06-13T06:00:00.000Z"` — stamped `Z` = 06:00 **UTC** = Jun 12, 23:00 PT. Different instant from what the UI shows me.
  - `@daily`: UI says Jun 13 12:00 AM local; API says `2026-06-14T00:00:00.000Z`. Contradictory.
- So the tool takes the literal cron numbers and (a) shows them as my-local in the browser, but (b) labels the identical numbers as UTC in the JSON. One of them is lying. If I trust the `?tz=` param, it's silently IGNORED (tz=Asia/Tokyo returns identical UTC values).
- Net: it does NOT actually answer "does `0 6 * * *` fire at 6am MY tz or UTC?" — it just renders 6:00 twice with two different tz labels. I still can't trust it over my own math.

## 3. ADVOCACY — 5/10
- I'd mention it as a nicer crontab.guru ONLY after warning a teammate the JSON timezone is wrong. A data person can't ship on a `Z` stamp that's actually local-wall-clock.

## Single biggest holdback
The API returns next-run times as `...Z` (UTC) but they're actually the raw cron wall-clock numbers, contradicting the UI's local render. Fix: pick one model — either compute real instants and emit true UTC ISO, AND let `?tz=` re-localize — or drop the misleading `Z`. Right now CSV-in/JSON-out is untrustworthy, which is a dealbreaker for me.
