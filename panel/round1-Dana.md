# Round 1 — Dana (Demand-gen marketer)

I came here for ONE thing: my marketing-automation tool wants a "cron schedule" for a
recurring report and I just want to type "every Monday at 8am" and copy the answer. I did
exactly that. The "describe a schedule in plain English" box took "every Monday at 8am",
spat out `0 8 * * 1`, dropped it into the top field with a Copy button, AND showed me
"At 08:00 AM, only on Monday" plus the next 5 run dates so I could sanity-check it was
right. Copy verified — clipboard got `0 8 * * 1`. That's my whole job done in ~15 seconds.

I tried the CRONTAB FILE toggle too (top-left, obvious). Pasted 3 lines, got "3 JOBS"
each explained line-by-line, ignoring my trailing command labels. Clean, but not my use
case — I'd never paste a whole crontab.

Friction as a non-technical user: "every monday morning" failed with "Couldn't... Try" —
a marketer typing loosely gets nothing, and the example chips don't make clear it wants
an explicit time. The result also shows in TWO places (top field + a "Generated:" line
lower down), mild redundancy. And there are two copy buttons ("Copy" and "Copy link")
which made me pause for a second about which copies the expression.

```json
{
  "name": "Dana",
  "clarity": "Yes",
  "value": "Yes",
  "advocacy": 8,
  "advocacy_reason": "Solved my exact recurring problem instantly — describe in English, get the cron, copy, and the 'next 5 runs' let me trust it without knowing cron syntax. Not a 9/10 because the natural-language parser is brittle ('every monday morning' failed), the dual result display + two copy buttons add small confusion, and it's a single-purpose tool I'd only need every few weeks. I'd screenshot it for my team channel the next time someone asks 'what do I put in the cron field?'",
  "found_crontab_mode": "Yes",
  "most_important_quote": "Or describe a schedule in plain English",
  "bugs_or_friction": [
    "'every monday morning' (no explicit time) fails with 'Couldn't... Try' — loose marketer phrasing gets rejected with no suggested fix",
    "Generated cron shows in two places (top Cron expression field + a 'Generated:' line lower down) — mild redundancy",
    "Two copy buttons ('Copy' for the expression, 'Copy link' for a permalink) — momentary which-one-do-I-click pause",
    "DIALECT (Unix/Quartz/AWS) and the UTC source/display selectors are dev concepts that mean nothing to me; fine that they're optional but they're a lot of chrome above my plain-English box"
  ]
}
```
