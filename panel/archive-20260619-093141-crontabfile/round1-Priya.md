# Priya — Round 1
- advocacy: 8
- clarity: Yes
- value: Yes

## What I did
Opened cold; the H1 "Cron Explainer" + subhead told me the job in ~5 seconds, and my exact PR expression `*/15 9-17 * * MON-FRI` was already prefilled. I pasted the numeric form `*/15 9-17 * * 1-5` (worked identically) and got "Every 15 minutes, between 09:00 AM and 05:59 PM, Monday through Friday" plus next-5-runs and a previous-run line. I then drove both tz selectors through all four source/display combinations, checked the network tab, copy-link, permalink, and an invalid expression.

## Friction (brutally honest)
- Invalid expr (`*/15 99 * * 1-5`) just turns the input border red and silently drops the English panel — no message saying "hour 99 out of range." A CLI (croniter) tells me exactly which field is wrong; this makes me guess.
- The source-tz nudge "Servers usually run cron in UTC" is genuinely useful for my PR-review case, but the source-tz block, the "5-field Unix / 6-field Quartz..." help line, and the privacy line are all stacked in small grey text — slightly noisy; took a second to find the source selector vs the format-help text.
- "Or describe a schedule in English" generator is nice but irrelevant to my flow and pushes the actual results below the fold on first load.
- No keyboard-only affordance noticed for the tz toggles beyond clicking; fine, but I'd want focus rings for keyboard-first use.

## On the timezone feature specifically
- Yes — exercised BOTH selectors independently across 4 states. Source=Local/display=Local: runs at 11:30/11:45 LA, correct for business-hours-in-my-tz. Source=UTC/display=Local: subtitle "Runs in UTC · shown in America/Los_Angeles" appears and runs shift to 02:00/02:15 AM LA (09:00 UTC = 02:00 LA, UTC-7) — math checks out. Source=UTC/display=UTC: heading reads "NEXT 5 RUNS — UTC", runs at 09:00 UTC, and the dual line correctly disappears when source==display. Restoring display=Local brings the dual line back.
- The source-vs-display distinction was clear to ME because the labels "This schedule runs in" vs "Show times in" are well-chosen and the "Runs in X · shown in Y" line only shows on a mismatch — that line is what made it click. This is exactly the disambiguation I need for the PR: I can set source=UTC (server runs UTC) and display=Local to confirm when it actually fires for me.
- Trust win: zero network requests fired during any interaction — "nothing is sent" is literally true. I checked. That's why I'd actually use it over pasting into a random web tool.
- Permalink/copy-link correctly encodes `?src=UTC`, so I can drop the link in the PR review for my teammate. Solid.
