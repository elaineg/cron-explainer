```
clarity: Yes
value: Yes
advocacy: 8
```

# Round 1 — Tester 8 (Rob, freelance brand designer)

**Task:** decode `0 */4 * * *`, confirm next backup run in my time.

## CLARITY — Yes
- Title "Cron Explainer" + subhead "Paste a cron expression and see what it means in plain English, plus its next 5 run times" told me everything in ~3s.
- Prefilled example (`*/15 9-17 * * MON-FRI`) already showing a result meant I didn't stare at an empty box wondering if it worked. Good — for someone who comes back twice a year, that's zero relearning.

## VALUE — Yes
- Today I'd google "crontab guru" or squint at the comment in my backup script. This is the same thing crontab.guru does, but with one thing that beats it for me: **next runs in MY local time (America/Los_Angeles), with both the date AND "in 24 minutes / in 4 hours."** That relative column is the actual answer to my real question ("when's the next backup?") — I don't have to do timezone math in my head.
- `0 */4 * * *` resolved instantly to "On the hour, every 4 hours." Correct, plain, done.
- Live updates as I type, no Submit button to find. Exactly right for occasional use.
- Garbage input gave a useful error: "it has 3 fields. Expected 5 fields: minute hour day-of-month month day-of-week." Tells me what I did wrong instead of just failing.

## ADVOCACY — 8
Would I bookmark it? Yes. Would I bring it up to a designer friend? Probably not unprompted — most of my friends never touch cron. But to anyone who's ever cursed at a crontab line, I'd send this link immediately. Solid, does one thing cleanly, no signup, no clutter.

**Biggest holdback (keeps it off 9–10):** it's functionally crontab.guru + timezone-aware next-runs. The local-time relative column is a real improvement, but it's an *increment* over a tool I already trust, not a reason to switch my muscle memory. Nothing here is broken — there's just no hook that makes me abandon the bookmark I already have. A tiny "copy as plain English" or persistent recents would push it over.

verdicts: clarity Yes / value Yes / advocacy 8
```json
{"tester": 8, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Increment over crontab.guru, not a switch-my-habit reason", "No persistent recents/history for a tool I'd revisit occasionally"], "priorConcernsAddressed": "n/a"}
```
