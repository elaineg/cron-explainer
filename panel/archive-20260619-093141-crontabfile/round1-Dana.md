# Dana — Round 1
- advocacy: 7
- clarity: Yes
- value: Yes

## What I did
Opened cold on desktop and phone. Headline "Cron Explainer" + subhead "describe a schedule
in English and get the cron expression generated for you" told me in 5 seconds this can do
my exact job. Scrolled to "Or describe a schedule in plain English", typed "every Monday at
8am". It instantly generated `0 8 * * 1`, echoed "At 08:00 AM, only on Monday", and listed
the next runs. Hit Copy — clipboard got `0 8 * * 1`. That is literally what my automation
platform wants. Done in under a minute. This is the answer to my problem.

## Friction (brutally honest)
- WRONG THING IS ON TOP. The first box is "Cron expression" prefilled with cryptic
  `*/15 9-17 * * MON-FRI` and a Copy button. For two seconds I thought I had to UNDERSTAND
  that gibberish. The plain-English box — the only reason a non-engineer like me is here —
  is buried THIRD, below the dialect tabs and a paragraph about servers. On my phone the
  English box is fully below the fold. Flip it: lead with "describe in plain English," demote
  the raw-cron decoder.
- "DIALECT: Unix / Quartz / AWS", "5 fields — standard Unix cron", "Servers usually run cron
  in UTC" — that is engineer vocabulary. My platform just said "cron schedule"; I don't know
  if I need Unix or Quartz. A one-liner like "Not sure? Unix is the default for most tools"
  would stop me second-guessing the copied answer.
- "Generated: 0 8 * * 1" appears in small gray text under the English box with no Copy button
  right there — I had to trust that the top field updated. A Copy next to the generated result
  would feel safer.

## On the timezone feature specifically
For my dead-simple "Monday 8am" need, the TWO timezone selectors are clutter, not help.
"THIS SCHEDULE RUNS IN — Local / UTC" sits ABOVE the input I actually want, with a scary
note "Servers usually run cron in UTC — switch the source to UTC if this runs on a server."
I'm not a server person; that sentence made me wonder if I was doing it wrong. The second
"Show times in" selector by the next-run list is more harmlessly ignorable. Net: source-vs-
display is over my head and physically in my way on the path to my answer. It didn't break
anything and the default (Local) gave me the right cron, so it's tolerable — but for the
"I just want the string" crowd it's noise placed before the signal. Hide both behind an
"Advanced / timezone" toggle and lead with the English box, and I'd jump to a 9.
