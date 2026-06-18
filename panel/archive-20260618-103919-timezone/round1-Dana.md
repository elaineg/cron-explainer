# Dana — Demand-gen marketer

**Task:** my marketing-automation tool wants a "cron schedule" for a recurring report export. I just want "every Monday at 8am" and the string to paste. I typed exactly that into the plain-English box and got `0 8 * * 1` instantly, with "At 08:00 AM, only on Monday" + the next 5 run dates to sanity-check it. Copy button put it on my clipboard. That is the whole job done in under 10 seconds. Genuinely delightful.

## 1. Advocacy: 8/10
I'd recommend it, but to a SPECIFIC person, not broadly. I'd drop it in our team channel the next time someone (incl. me) stares blankly at a "cron schedule" field in HubSpot/Zapier/an export tool. That's a real recurring moment for marketers and ops people who aren't engineers. It's not a daily tool for me, so it doesn't crack 9 — I won't bring it up unprompted out of the blue. But the moment I hit that field again, this is the link I'd reach for. The reverse direction (English → cron) is the killer feature for non-devs; pasting a cron I already have is the dev use case I care less about.

## 2. Value clear in 30s? YES
The H1 "Cron Explainer" + subhead "describe a schedule in English and get the cron expression generated for you" told me exactly what it does and that it works in MY direction (English in, code out). The example chips ("every weekday at 9am", "9am every monday") instantly signaled "yes, plain English is allowed here" — that's what made me trust it before typing. Nothing confused me.

## 3. Brutal friction
Biggest thing: the page leads with the **"Cron expression" paste box at the very top** — the dev-first direction. For me the valuable box is the SECOND one ("Or describe a schedule in plain English"). On my first scroll my eye hit a pre-filled `*/15 9-17 * * MON-FRI` string I didn't write and don't understand, which reads as "this is for engineers" for a half-second before I saw the English box below. Flipping the order (English box first) would make a non-dev land on the right tool immediately. Minor: the Quartz/AWS/dialect stuff is noise to me — fine that it's there, but it's the loudest secondary content and means nothing to my workflow.

## Dialect selector + Translate control — discoverability
FOUND BOTH UNPROMPTED on cold load. The "DIALECT — Unix / Quartz / AWS" toggle sits right under the cron box, and "Translate to [Quartz] [AWS]" is in the top-right of the result card. I noticed them but consciously ignored them — irrelevant to my job. They're discoverable, just not for me.

```json
{"tester": 0, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["dev-first paste box is on top; English-in box (the one a marketer needs) is below the fold-ish and the pre-filled cron string reads 'for engineers' on first glance", "Quartz/AWS dialect controls are prominent but meaningless to a non-dev — secondary content is the loudest"], "priorConcernsAddressed": "n/a"}
```
