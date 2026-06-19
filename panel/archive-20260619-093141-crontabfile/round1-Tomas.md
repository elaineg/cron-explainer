# Tomás — Round 1
- advocacy: 9
- clarity: Yes
- value: Yes

## What I did
Opened cold on Edge (desktop). Title "Cron Explainer" + subtitle "Paste a cron
expression and see what it means in plain English, plus its next 5 run times" told me
exactly what it is in under 10 seconds — no jargon, no signup, no install. That alone is
the win: IT blocks installs and this is just a webpage.

Cleared the demo, pasted my inherited `30 2 1 * *`. Got "At 02:30 AM, on day 1 of the
month" plus the next 5 run dates. That's precisely what I needed — I now know what the
mystery line on my server does without learning cron syntax.

Then exercised both timezone selectors (see below) and read the privacy line.

## Friction (brutally honest)
- Minor: when I set SOURCE to UTC, the next-run dates flip to the PRIOR day (e.g.
  "Tue, Jun 30, 2026, 07:30 PM" instead of Jul 1). Mathematically correct — 02:30 UTC
  on the 1st is 7:30 PM Pacific on the 31st/30th — but my first half-second was "wait,
  day-1-of-month shows the 30th?" The "Runs in UTC · shown in America/Los_Angeles" line
  right above resolves it, so I recovered. Worth keeping that line glued to the list.
- The DEVELOPERS / API section at the bottom is irrelevant noise to me, but it's below the
  fold and clearly labeled, so it doesn't get in my way.
- No console errors, instant response. Nothing felt broken.

## On the timezone feature specifically
This is genuinely the feature that makes it useful for MY situation (an inherited SERVER
crontab), not just a syntax toy. The nudge "Servers usually run cron in UTC — switch the
source to UTC if this runs on a server" is exactly the prompt an ops person needs — I'd
have naively read 2:30 AM as MY local time and been wrong about when the job actually
fires. Setting SOURCE=UTC, keeping DISPLAY=Local, the block clearly said
"Runs in UTC · shown in America/Los_Angeles" and showed me 07:30 PM my time. That "aha,
it actually runs in my evening" is real value.

Source-vs-display is legible to a medium-tech ops person AS LABELED: "THIS SCHEDULE RUNS
IN" vs "Show times in" are good plain-English labels (much clearer than "source/display"
jargon would be). The two UTC buttons being identical-looking is the one trip hazard, but
the section headers keep them distinct. The "Previous run" line is a nice bonus for
confirming "did last night's job fire."

Privacy: "Runs entirely in your browser — nothing is sent." — yes, this reassures me. As
someone who won't paste company data into random sites, a cron expression isn't sensitive
anyway, but the explicit line plus the obvious client-side behavior (instant, no network
spinner) means I'd actually use this at work without a second thought.
