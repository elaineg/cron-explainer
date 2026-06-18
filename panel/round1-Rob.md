# Rob — Round 1
- advocacy: 8
- clarity: Yes
- value: Yes

## What I did
Loaded cold. The headline "Cron Explainer" + subhead "Paste a cron expression and see what
it means in plain English, plus its next 5 run times" told me what this is in about 5
seconds — no guessing. Cleared the prefilled example, pasted my real `0 */4 * * *`. Got
"On the hour, every 4 hours" plus next 5 runs AND a "Previous run: ... (3 hours ago)" line.
That previous-run line is the thing I actually open these for — confirms my last backup
already fired and the next is "in 36 minutes." Clean.

## Friction (brutally honest)
- Minor: the two tz controls live far apart — SOURCE ("THIS SCHEDULE RUNS IN") is way up by
  the cron box, DISPLAY ("Show times in") is down next to the run list. I didn't connect
  them as a pair until I'd scrolled twice. They'd read as one concept if they were closer.
- The DEVELOPERS / API block at the bottom is noise for me — I'm not hitting an endpoint, I
  just want the times. Harmlessly ignorable, but it's the longest block on the page.
- "Copy" / "Copy link" — clicked, label behavior fine (copy verified visually; clipboard
  read blocked in test env, not reporting as a bug).
- Nothing broke. No console errors. Parsed every form of my expression. Fast.

## On the timezone feature specifically
This is the part I expected to be over my head, and it mostly wasn't — because of ONE line.
By default both are "Local," times show in my Pacific, and I can completely ignore the whole
thing. That's the right default for an occasional user: invisible until I want it.

The win: I flipped SOURCE to UTC (the helper text literally says "switch the source to UTC
if this runs on a server" — that IS my backup script). The runs shifted to 1/5/9 PM Pacific
and a line appeared: "Runs in UTC · shown in America/Los_Angeles." THAT sentence is what
makes two selectors safe for someone like me — it spells out which is which in English so I
don't have to hold "source vs display" in my head. Without that line, two tz dropdowns would
have just confused me. With it, it answered my actual question: "my server runs UTC, when
does it fire MY time."

Knock for the 8 not a 9: I had to discover that myself, and the two selectors being far
apart on the page makes the source/display relationship less obvious than it should be. Put
them next to each other (or one labeled "runs in __ , show in __" row) and this is a 9.
