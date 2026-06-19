# Jules — Round 1
- advocacy: 9
- clarity: Yes
- value: Yes

## What I did
Cold-opened on desktop. No login wall (I'd have bounced instantly) — the line
"Runs entirely in your browser — nothing is sent" is exactly the reassurance I look for.
H1 "Cron Explainer" + the subhead ("Paste a cron expression... or describe a schedule in
English and get the cron expression generated for you") told me what this is in ~10s.
Typed my real task "every 6 hours on weekends" into the plain-English box → it generated
`0 */6 * * 0,6` and confirmed in English "On the hour, every 6 hours, only on Sunday and
Saturday." Next 5 runs rendered correctly, plus a "Previous run" line (nice). Permalink
encodes my expression AND tz settings (`&src=utc`) so I can paste it into a Discord thread
without anyone signing up. Also checked mobile at 375px.

## Friction (brutally honest)
- Almost nothing blocking. The page is dense — SOURCE tz sits way up top near the cron
  field, but DISPLAY tz lives down in the NEXT-5-RUNS block. On first pass I didn't realize
  the two selectors were related until I scrolled and saw the "Runs in X · shown in Y" line
  tie them together. A medium-tech user gets there; a less patient one might miss one of them.
- The Local/UTC buttons LOOK like the only source options. I only discovered the box beside
  them is a full type-anything IANA search by poking at it ("Berlin" → Europe/Berlin worked).
  That's a great feature that's nearly invisible — looks like a read-only label, not an input.
- Two separate "Local" and two "UTC" toggles on one screen is mildly confusing at a glance;
  the section headers (THIS SCHEDULE RUNS IN / Show times in) do disambiguate, but only if
  you read them.
- Mobile (375px): clean, no horizontal scroll, both selectors tappable, indicator visible.
  Would genuinely use this on my phone.

## On the timezone feature specifically
This is the killer feature for my exact use case and it WORKS. I set source = UTC (where my
self-hosted bot runs) and display = my local LA — the first run flipped from "Sat 12:00 AM"
to "Fri 05:00 PM," correctly showing the cross-day shift a weekend-cron causes. The combined
"Runs in UTC · shown in America/Los_Angeles" badge appears only when they differ and collapses
to plain "NEXT 5 RUNS — UTC" when they match — that's the right behavior and stops me from
second-guessing. Setting "server runs in Berlin, show me in LA" worked too. This is the thing
that would've saved me a headache configuring Uptime Kuma. Only reason it's a 9 not a 10: the
source typeahead being disguised as a label, and the two selectors being far apart on screen.

```json
{"tester": 3, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Source-tz typeahead looks like a read-only label, not an input — easy to miss it accepts any IANA zone", "SOURCE and DISPLAY selectors are far apart on the page; their relationship isn't obvious until you scroll and notice the 'Runs in X · shown in Y' line"], "priorConcernsAddressed": "n/a"}
```
