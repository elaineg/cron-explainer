# Tomás — Operations analyst

## My job, tested cold
I inherited a server with crontab lines I didn't write. First thing I did: pasted `30 2 1 * *`.
Got back instantly: "At 02:30 AM, on day 1 of the month" + NEXT 5 RUNS (Jul 1, Aug 1, Sep 1…) +
"Previous run: Mon, Jun 1, 2026 (17 days ago)". That is EXACTLY what I needed and it took 3 seconds.
The next-run list is the part I didn't know I wanted — now I can tell my boss when the job fires next.

## 1. Advocacy: 9/10
I'd recommend this unprompted to anyone on my ops/infra team and drop it in our Teams channel.
Why not 10: it's a single-screen utility, not a daily-driver, so "9 = bring up unprompted" fits but
I won't open it every day. Nothing here is broken or annoying. Strong, honest 9.

## 2. Value clear in 30s? YES
Title "Cron Explainer" + subtitle "Paste a cron expression and see what it means in plain English,
plus its next 5 run times" told me precisely what it is and that it's for me. No jargon wall.

## 3. Brutal friction — biggest thing wrong
Honestly minor: the "DEVELOPERS" footer shows `GET /api/explain?expr=…`. As someone wary of pasting
company data into random sites, seeing an API endpoint made me pause and wonder if my crontab gets
sent somewhere. I checked the network myself — it's 100% client-side, NOTHING leaves the browser as I
type. But a non-technical user won't check. ONE line near the input like "Runs entirely in your
browser — nothing is sent to a server" would convert my wariness into trust instantly. That's my one ask.
Smaller: nothing else. Error messages are excellent ("it has 2 fields. Expected at least 5 fields:
minute hour day-of-month month day-of-week") — that taught me cron structure without a manual.

## Dialect selector + Translate: FOUND BOTH UNPROMPTED on cold load
- DIALECT selector (Unix / Quartz / AWS pill toggle) sits directly under the input — saw it in the
  first 5 seconds. Clear.
- "Translate to [Quartz] [AWS]" lives in the top-right of the IN PLAIN ENGLISH result box. Saw it as
  soon as my result appeared. Clicked "Quartz" → it showed `Quartz: 0 30 2 1 * ?` with Use/Copy
  buttons (doesn't nuke my input — nice). AWS gave `30 2 1 * ? *`. Both correct.
- Tried a non-Unix expr `0 15 10 ? * MON-FRI` (Quartz, with the `?`): parsed fine → "At 10:15 AM,
  Monday through Friday" + next runs. The `?` didn't trip it up. Solid.

```json
{"tester": 4, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["No 'runs in your browser, nothing sent to a server' reassurance near the input — DEVELOPERS /api footer made me, a data-wary corporate user, hesitate before trusting it with internal crontab"], "priorConcernsAddressed": "n/a"}
```
