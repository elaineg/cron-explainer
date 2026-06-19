# Round 1 — Priya (Senior backend engineer, keyboard-first, skeptical)

Tested cold at http://localhost:3210. Exercised both modes plus my real PR scenario
(`*/15 9-17 * * 1-5`), timezone source/display split, and a realistic multi-line crontab
(comments, env vars, blank line, one intentionally-invalid line).

```json
{
  "name": "Priya",
  "clarity": "Yes — h1 'Cron Explainer' + subhead 'Paste a cron expression and see what it means in plain English, plus its next 5 run times' told me exactly what it is in under 10s. No signup wall, 'Runs entirely in your browser — nothing is sent' killed my network-tab suspicion immediately.",
  "value": "Yes — this nails my actual PR-review workflow. `*/15 9-17 * * 1-5` rendered as 'Every 15 minutes, between 09:00 AM and 05:59 PM, Monday through Friday' (correctly through 17:59, not 17:00), which is the at-a-glance confirmation I open a PR to get. Today I do this in my head or `man 5 crontab` + crontab.guru, then mentally convert UTC→PT; here the RUNS IN (source=UTC) / SHOW TIMES IN (display=Local) split did the DST-correct conversion for me — the UTC business-hours window correctly showed as overnight LA runs. The whole-crontab mode is the real win over crontab.guru, which is one-expression-at-a-time: I pasted a full manifest-style crontab and got a per-line breakdown + an honest '4 JOBS · 2 ENVIRONMENT VARIABLES · 2 COMMENTS · 1 INVALID LINE' summary, with the bad line flagged INVALID ('minutes part must be >= 0 and <= 59') without breaking the other rows.",
  "advocacy": 8,
  "advocacy_reason": "Genuinely good — I'd drop the link in our backend Slack next time someone's CronJob PR comes up, and the GET /api/explain endpoint (returns JSON, UTC ISO 8601) means I could script it in CI. Not a 9/10 because: (1) it explains an EXPRESSION but doesn't speak K8s — I still mentally map a CronJob's `schedule:` + the cluster's timezone; a 'this is a K8s CronJob, which defaults to UTC' nudge would close my exact use case. (2) Per-job 'next 5 runs' in whole-file mode is a lot of vertical scroll for a 10-line crontab — I'd want a collapse/compact toggle. Neither is a defect, just the gap between an 8 and an unprompted-rave 9.",
  "found_crontab_mode": "Yes — the SINGLE EXPRESSION · CRONTAB FILE two-segment toggle is directly above the input, above the fold, impossible to miss. Zero discoverability problem.",
  "most_important_quote": "Every 15 minutes, between 09:00 AM and 05:59 PM, Monday through Friday — that's the exact sentence I open a PR review to confirm, and it correctly went to 05:59 PM not 05:00 PM.",
  "bugs_or_friction": [
    "Whole-file mode renders next-5-runs for EVERY job inline — a 10-line crontab is a long scroll; a compact/collapsible per-job view would help (friction, not a bug).",
    "Doesn't acknowledge K8s/Quartz/AWS context at the FILE level — single-expr has a dialect toggle but crontab-file mode auto-detects per line silently; fine, but a 'CronJobs run in UTC' hint for my source-tz decision would be the cherry.",
    "No real bugs found: invalid line isolated correctly, env/comment de-emphasis correct, blank-line spacing preserved, summary count honest, TZ conversion DST-correct, copy verified visually (clipboard read worked: got the raw expression)."
  ]
}
```
