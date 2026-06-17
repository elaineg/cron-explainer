# VALIDATION — cron-explainer (multi-dialect add-feature)

Verdict: **DO-NOT-SHIP** (two silently-wrong-output P0s for documented dialect examples).

5-second test: PASS. Headline + prefilled example + visible Unix/Quartz/AWS dialect selector
+ Translate control all legible on cold load; no console/page errors.

## P0 — silently wrong, no warning (non-expert routed to wrong answer)
1. **AWS 6-field auto-detects as Quartz → description contradicts next-runs.**
   Type `0 9 ? * MON-FRI *` (the spec's own AWS example, success-check line 111). The dialect
   auto-detects **Quartz** ("read as Quartz/Spring"), not AWS. Result: description reads
   "At 09:00 AM, Monday through Friday" but NEXT 5 RUNS show `Fri, Jan 1, 2027, 12:09 AM`,
   `01:09 AM`, `02:09 AM`, `03:09 AM`, `04:09 AM` — hourly on a single day in 2027. The English
   text and the run times openly disagree and no warning is shown. Forcing AWS via override
   fixes it (`Jun 18 2026 09:00`...), but a non-expert accepts the default. The `?` telltale
   token (spec line 13/16 says it should bias AWS) is ignored by auto-detect. Same defect via
   API: `/api/explain?expr=0%209%20%3F%20*%20MON-FRI%20*` returns 200 with the weekday-9am
   description but `next:["2027-01-01T00:09:00Z","...01:09Z",...]`. Screenshot: p0-aws-naive.png.
   Expected: detect AWS (or at minimum, next-runs that match the stated description).
2. **Quartz/AWS YEAR field ignored in next-run computation → "only in 2027" runs in 2026.**
   Type `0 0 12 ? * MON 2027` (spec success-check line 109). Description: "At 12:00 PM, only on
   Monday, only in 2027" but next runs are `2026-06-22`, `2026-06-29`, ... (2026, not 2027).
   API confirms: `next:["2026-06-22T12:00:00Z",...]`. Worse, `0 0 12 1 1 ? 2030` →
   description "only in 2030" but `next:["2027-01-01",...,"2031-01-01"]` (years 2027/28/29/31
   that violate the stated year=2030). The year constraint is shown in prose but not honored in
   computation — silently wrong.

## What works (verified)
- Quartz `0 0 9 ? * MON-FRI`: badge Quartz, "At 09:00 AM, Monday through Friday", 5 weekday-9am runs. OK.
- Quartz seconds `*/30 * * * * *`: "Every 30 seconds"; next runs spaced exactly 30s
  (3:57:00, 3:57:30, 3:58:00...). Seconds honored. OK.
- AWS `cron(0 10 * * ? *)`: wrapper stripped, badge "cron() wrapper — AWS", "At 10:00 AM", correct runs. OK.
- Translate Unix `0 9 * * 1-5` → Quartz: preview chip `0 0 9 ? * MON-FRI` (valid, correct) + Use/Copy. OK.
- Translate Quartz seconds → Unix: amber note "Sub-minute seconds can't be represented in Unix
  5-field cron." — no silently-wrong result. OK.
- Copy cron: clipboard = exact expression, green "Copied!" flash. OK.
- API: legacy `0 9 * * 1-5` and Quartz `0 0 9 ? * MON-FRI` both 200 identical shape; `banana`
  400 JSON error; `tz=Mars/Phobos` 400 "Unknown timezone"; `tz=America/New_York` shifts UTC instants. OK.
- Regression: bare Unix explains + permalink `/e/0%209%20*%20*%201-5`; `/e/<expr>` prerenders
  "Every 10 minutes"; `/e/banana` 200 (no 5xx); garbage "hello world" → inline error, no crash;
  empty input no crash; English "every 10 minutes on weekends" → `*/10 * * * 0,6`; unsupported
  phrase → friendly message. All OK.
- Mobile 375px: cron input + dialect selector both above the fold; nothing pushed off. OK.

## What this validation cannot catch
Taste/aesthetics, cronstrue phrasing nuance across every dialect, real DST-boundary correctness,
accessibility, and long-term retention. I tested documented examples + adversarial inputs, not
the full cron grammar space.
