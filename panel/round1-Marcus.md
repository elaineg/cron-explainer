# Round 1 — Marcus (Frontend engineer, 2yr, high-tech, desktop Chrome + devtools)

```json
{
  "name": "Marcus",
  "clarity": "Yes",
  "value": "Yes",
  "advocacy": 8,
  "advocacy_reason": "This is the tool I actually wanted: I type 'every weekday at 9am' and get 0 9 * * 1-5 with a plain-English readback and next-5 runs — no more hand-building on crontab.guru. The CRONTAB FILE mode beats crontab.guru outright (guru does one expression at a time; this explains my whole Vercel/GH-Actions crontab line-by-line, labels env vars and comments, and isolates invalid lines with precise per-line errors). Quartz/AWS dialects + a documented GET /api/explain endpoint are a pleasant surprise for an engineer. Held back from 9-10 because the English parser is brittle: 'every 15 minutes during business hours' and 'at midnight every day' both fail with no suggestion of what phrasing works — that's the exact moment I'd bounce back to googling. Fix the NL coverage/forgiveness and this is a 9 I'd drop in team Slack.",
  "found_crontab_mode": "Yes",
  "most_important_quote": "The SINGLE EXPRESSION · CRONTAB FILE toggle sits right above the input, impossible to miss — and crontab-file mode explains my entire file at once, which crontab.guru can't do.",
  "bugs_or_friction": [
    "NL parser too brittle: 'every 15 minutes during business hours' -> 'Couldn't read that schedule'; 'at midnight every day' silently produces nothing. Common phrasings should resolve or suggest the nearest example.",
    "On NL parse failure the previously-generated valid cron stays in the Cron expression box — ambiguous whether the result is stale or current.",
    "Copy button label changes to 'Copied' (good) but clipboard read was blocked in my headless test env — copy verified visually, not reported as a regression.",
    "Toggle is a black/white text-pill; active state reads fine but a slightly stronger visual affordance (it looks like static text until hovered) would help first-timers know it's clickable."
  ]
}
```
