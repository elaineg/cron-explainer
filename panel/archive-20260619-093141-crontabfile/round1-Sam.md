# Sam — Round 1
- advocacy: 8
- clarity: Yes
- value: Yes

## What I did
Opened cold on a 375px mobile viewport (where I live between meetings). Read the title
"Cron Explainer" + subtitle in ~10s and immediately got it: paste cron -> plain English +
next runs, or describe in English -> cron. Pasted `0 9 * * MON-FRI` for a real ticket I'd
write. Got "At 09:00 AM, Monday through Friday" plus the next 5 runs and a previous-run
line. Found the PERMALINK + Copy link near the bottom. Set SOURCE=Europe/Berlin and
DISPLAY=Asia/Tokyo, copied the link, opened it fresh — cron, source, AND display all
restored, and "Runs in Europe/Berlin · shown in Asia/Tokyo" reappeared. This is exactly
the artifact I want in a ticket: cron string + English gloss + a link that re-opens with
the same timezone framing for engineers and stakeholders.

## Friction (brutally honest)
- The two timezone controls are FAR apart and look identical: SOURCE ("THIS SCHEDULE RUNS
  IN") sits up by the cron input; DISPLAY ("Show times in") is buried inside the NEXT 5 RUNS
  card. Both have a Local/UTC toggle + an "Other…" combobox. On mobile I had to scroll and
  read carefully to be sure which was which. They should live side by side, or the source
  one should be labeled "Source / where the server runs" more loudly.
- The "Other…" combobox isn't obviously a city picker — placeholder just says "Other…". I
  typed "Berlin" and a one-row dropdown appeared, which worked, but a less patient me might
  not realize I can type a city. A little "type a city/IANA zone" hint would help.
- Permalink uses `?tz=` for DISPLAY and `?src=` for SOURCE, which is backwards from the API
  (where `?tz=` is the source). The Developers note flags this, but it's a footgun if an
  engineer hand-edits the link. Minor, but I'd quote it in a ticket.
- Copy link works (verified the full URL with both tz params landed on the clipboard).

## On the timezone feature specifically
Genuinely useful and the killer reason I'd paste this into a ticket. "Runs in Berlin ·
shown in Tokyo" is the one line that makes BOTH an engineer (cares where it executes) and a
stakeholder (cares what time they'll see it) understand the schedule without a Slack
thread. It persists into the share link and round-trips perfectly. Only gripe is the
clarity of WHICH selector is source vs display when scanning fast on mobile — fix the
proximity/labeling and this is a 9.
