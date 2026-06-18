# Priya — Senior backend software engineer

**Scenario:** reviewing a PR that adds `*/15 9-17 * * 1-5` to a K8s CronJob; want to confirm
business-hours-weekdays at a glance and see next runs in my TZ before approving.

## 1. Advocacy: 8/10 — yes, I'd recommend it
I'd drop this in our team Slack channel for PR reviews. It answered my exact question in one
glance: pasted `*/15 9-17 * * 1-5` → "Every 15 minutes, between 09:00 AM and 05:59 PM, Monday
through Friday" + the next 5 runs with a Local/UTC toggle (defaulted to my America/Los_Angeles)
and a "previous run" line. That's faster than `man 5 crontab` + mental math, and crontab.guru
doesn't do Quartz/AWS or next-run timezones. Not a 9/10 because of the API auto-detect bug below
and because it lives on a web page when I'd rather `curl` it (the API exists but misfires).

## 2. Value clear in 30s? YES.
Title "Cron Explainer" + subhead "Paste a cron expression and see what it means in plain
English, plus its next 5 run times... Supports Unix, Quartz/Spring, and AWS EventBridge." It
even cold-loads pre-filled with a sample expression so the whole output is wired up before I
type. Zero signup, no network calls to anything sketchy. Clear.

## 3. Brutal friction
**Biggest:** the `/api/explain` AUTO-DETECT is silently WRONG for bare 6-field Quartz. UI with
Quartz selected reads `0 0 12 * * ?` correctly as "At 12:00 PM". But
`GET /api/explain?expr=0%200%2012%20*%20*%20%3F` (no dialect param, which the docs advertise as
auto-detecting) returns **"At 12:00 AM (midnight), on day 12 of the month"** — confidently
wrong. Passing `&dialect=quartz` fixes it ("At 12:00 PM"). For a CLI-first reviewer who curls a
teammate's bare expression, a wrong answer is worse than no answer; this is the kind of thing
that makes me stop trusting the tool. Either fix auto-detect for the `?`-less 6-field Quartz case
or stop claiming auto-detect.
**Minor:** API JSON always reports `"dialect": None` even on a correct parse — a consumer can't
tell which dialect was applied. **Plus:** error handling is genuinely good — 4-field input gave a
red border + "Not a valid cron expression: it has 4 fields. Expected at least 5..." Nice.

## Discoverability of new features
FOUND BOTH UNPROMPTED on cold load. DIALECT selector (Unix/Quartz/AWS segmented buttons) sits
directly under the expression input — obvious. TRANSLATE control is "Translate to: Quartz | AWS"
in the top-right of the IN-PLAIN-ENGLISH result card; clicking Quartz expanded an inline
`Quartz: 0 */15 9-17 ? * MON-FRI` row with "Use" and "Copy" — non-destructive (doesn't clobber
my input unless I click Use). Both correct and well placed. Copy verified visually + clipboard
read worked in test env.

```json
{"tester": 3, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["/api/explain auto-detect mis-parses bare 6-field Quartz '0 0 12 * * ?' as '12:00 AM on day 12' (explicit &dialect=quartz works)", "API JSON always returns dialect:None even on correct parse"], "priorConcernsAddressed": "n/a"}
```
