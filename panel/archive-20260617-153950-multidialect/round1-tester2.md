```
clarity: Yes
value: Yes
advocacy: 8
```

# Round 1 — Tester 2 (Marcus, frontend eng, 2yr)

**Clarity — Yes.** The h1 "Cron Explainer" + subtitle ("describe a schedule in English and get the cron expression generated for you") told me in ~3s exactly what it does. That's my exact pain — I'd drop this in team Slack on legibility alone.

**Value — Yes, over crontab.guru.** crontab.guru only goes cron→English; it makes me hand-build the expression. Here I typed "every weekday at 9am" → `0 9 * * 1-5` and "every Monday and Thursday at 8am" → `0 8 * * 1,4`, both correct. The reverse direction is the whole reason I'd switch. Bonus polish crontab.guru doesn't have: next-5-runs in MY timezone, a real `GET /api/explain?expr=` returning clean JSON (great for scripting/CI), shareable `/e/<cron>` permalinks + Copy link.

## What worked
- Correct cron for the phrasings it understands; live readout + next runs update instantly.
- Real JSON API; bad expr → clear error ("Expected 5 fields..."). No console errors anywhere.
- Permalink route returns 200; clean Geist/Tailwind, zero janky CSS, nicely centered.
- Invalid phrase shows a helpful tip box ("Couldn't understand that schedule. Try: ...").

## What broke / annoyed
- **NL coverage is thin.** "noon every day", "twice a day", "every 90 minutes", "every quarter", "at 2:30pm on the first of every month", "last day of the month at 6pm" ALL fail. These are everyday phrasings — I hit the wall fast. crontab.guru can't do them either, but if the pitch is "type English," half my tries bouncing hurts.
- **Stale result on parse failure.** When a phrase fails, the error shows but the cron field + "IN PLAIN ENGLISH" keep the LAST valid value (verified: bad phrase after "every Sunday at midnight" still showed `0 0 * * 0`). A rushed user could copy a wrong expression. Clear the output (or grey it out) on failure.
- English input doesn't push to the URL, so I can't share an English-built schedule as a link — only the cron permalink.

## Biggest holdback on score
Coverage. The natural-language parser handles the headline examples but face-plants on common phrasings with no graceful fallback beyond a tip. Tighten the parser (months, "noon"/"midnight", N-minute intervals, ordinals) and clear stale output, and this is a 9 I evangelize.
