# Marcus — Frontend engineer

## Discoverability (the question I was told to answer honestly)
Found BOTH unprompted on cold load, above the fold, no scrolling. The **DIALECT** segmented
control (Unix / Quartz / AWS) sits directly under the cron input. The **Translate to** control
lives in the top-right of the "IN PLAIN ENGLISH" result card and shows the OTHER two dialects
(when I'm on Quartz it offers Unix/AWS — smart, no redundant self-option). I didn't have to hunt.
Clean, obvious, exactly where a dev's eye lands.

## 1. Advocacy: 9/10 — yes, I'd post this in team Slack unprompted
This is my exact pain. I never remember cron syntax and reflexively google crontab.guru. I typed
"every weekday at 9am" into the English box and got `0 9 * * 1-5` instantly — that's the thing I
actually wanted and crontab.guru does NOT do (it only goes expression→English, not English→cron).
The Quartz/AWS support seals it: I do GH Actions (Unix) AND Vercel/EventBridge work, and translating
`0 0 12 * * ?` (Quartz) → `0 12 * * ? *` (AWS) inline with a "Use"/"Copy" button — without
clobbering my input — is genuinely better than my 3-tab google dance. Next-5-runs with Local/UTC
toggle is the cherry; it answers "did I get the timezone right" before I deploy. There's even a
`GET /api/explain?expr=…&dialect=…` endpoint in a DEVELOPERS footer I could script against.
Holding back the 10th point: nothing's broken, but it's a single-purpose utility — I'd rave about it,
not evangelize daily.

## 2. Value clear in 30s? YES
H1 "Cron Explainer" + the subhead "Paste a cron expression... or describe a schedule in English and
get the cron expression generated... Supports Unix, Quartz/Spring, and AWS EventBridge." told me
exactly what it is and that it does the reverse direction I care about. The prefilled example
`*/15 9-17 * * MON-FRI` rendering live as "Every 15 minutes, between 09:00 AM and 05:59 PM, Monday
through Friday" made it self-demonstrating before I touched anything.

## 3. Brutal friction
Biggest thing wrong: honestly minor — the English→cron parser's robustness is the only thing I'd
stress-test more. The 5 quick-chip phrasings all worked, but I'd want confidence it doesn't silently
mis-parse a weird phrasing into a plausible-but-wrong expression (no obvious "couldn't parse that"
state surfaced when I typed clean inputs, so I can't tell how it fails on ambiguous English). For a
generator I'm pasting into prod schedules, a visible "I understood X" echo would build trust.
Smaller nits: zero. CSS is tight, no jank, no layout shift, no console errors, invalid expressions
show a clean red error ("minutes part must be >= 0 and <= 59") instead of crashing. Copy button
copied the real value. Nothing offended my front-end eye.

```json
{"tester": 1, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["No visible 'here's how I parsed your English' echo — can't tell how the English→cron generator fails on ambiguous phrasing, which matters when pasting into prod schedules", "Single-purpose utility ceiling — nothing broken, just not a daily-evangelize tool"], "priorConcernsAddressed": "n/a"}
```
