# Marcus — Round 1
- advocacy: 9
- clarity: Yes
- value: Yes

## What I did
Loaded cold on desktop Chrome. Header "Cron Explainer" + subhead ("Paste a cron expression
and see what it means in plain English, plus its next 5 run times — or describe a schedule
in English and get the cron expression generated for you") told me exactly what this is in
~5 seconds. This is the thing I google crontab.guru for, minus the manual field-building.
- Typed "every weekday at 9am" in the English box → got `0 9 * * 1-5` instantly. Exactly my
  motivating use case. The "Generated: 0 9 * * 1-5" echo + example chips are a nice touch.
- Pasted `*/5 * * * *` → "Every 5 minutes" + correct next-5 runs with "in X hours/days"
  relative labels.
- Copy button: clipboard genuinely contained `*/5 * * * *` (verified read, not just a label
  flip). Permalink updates with state (`?src=UTC&tz=UTC`) — shareable, good for a Slack drop.
- Invalid input `this is not cron 99 99` → clear inline error "Not a valid cron expression:
  Expression contains invalid values: 'this'". Good.
- Switched Unix/Quartz/AWS dialects — all present and working.
- Zero console errors across every flow. No CSS jank: tight alignment, toggles read clean.

## Friction (brutally honest)
- Two sets of identical-looking Local/UTC pill toggles (one under "THIS SCHEDULE RUNS IN",
  one in the runs card) could be momentarily confused at a glance since they look the same —
  the section labels save it, but a hair more visual differentiation would remove all doubt.
- The "DEVELOPERS" API blurb notes the API `?tz=` means SOURCE while the UI `?tz=` means
  DISPLAY. As an engineer I caught it, but that inversion is a footgun for anyone scripting
  the API after using the UI. Minor, but I'd flag it in our Slack.
- That's it. Nothing blocking.

## On the timezone feature specifically
This is the part I was most skeptical of and it nailed it. Default state (source Local,
display Local) shows 9:00 AM. I set SOURCE → UTC (I run server/Vercel cron): the runs card
immediately showed 02:00 AM with the banner "Runs in UTC · shown in America/Los_Angeles" —
exactly right (0 9 UTC = 02:00 PDT, UTC-7). Setting DISPLAY → UTC too snapped it back to
09:00 and the banner disappeared (only shows when source ≠ display, which is the correct
behavior). The "Servers usually run cron in UTC — switch the source to UTC if this runs on
a server" nudge is exactly the mental-model correction I need — I've been bitten by "9am in
my crontab.guru preview" vs "9am UTC on the box" before. The source-vs-display distinction
is clear and the math is correct. This is the feature that takes it from "neat" to
"pinned in our team Slack."
