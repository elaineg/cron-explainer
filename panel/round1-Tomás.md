Tomás — Operations analyst, Edge on a locked-down corporate Windows laptop. Inherited a server with crontab entries he didn't write.

```json
{
  "name": "Tomás",
  "clarity": "Yes",
  "value": "Yes",
  "advocacy": 9,
  "advocacy_reason": "This is dead-on my exact problem: I inherited a crontab full of lines like `30 2 1 * *` and this told me 'At 02:30 AM, on day 1 of the month' plus the next 5 real run dates without me learning cron. The CRONTAB FILE mode chewed through my whole pasted file at once — labeled the SHELL/PATH/MAILTO env lines, de-emphasized comments, flagged the bogus line and @reboot inline without nuking the rest, and gave me an honest summary count (4 jobs, 3 env, 3 comments, 2 invalid). Crucially for me: zero network calls — I watched the traffic, nothing POSTed, nothing left localhost — so I can actually paste company config without IT/security heartburn, and it's browser-only so IT can't install-block it. Not a 10 only because everything is local-time-defaulted; my server runs UTC and I had to know to flip 'RUNS IN' to UTC myself (it does work and the hint exists, but a first-timer could mis-read every time by 7 hours).",
  "found_crontab_mode": "Yes",
  "most_important_quote": "Runs entirely in your browser — nothing is sent. — backed up by reality: I saw zero external requests when I pasted my crontab.",
  "bugs_or_friction": [
    "Defaults to my Local timezone (America/Los_Angeles), but an inherited SERVER crontab almost always runs in UTC — the most common real use case starts off-by-timezone. The 'switch source to UTC' hint helps, but consider auto-suggesting UTC for crontab-file mode or making the UTC mismatch more prominent.",
    "When RUNS IN=UTC but SHOW IN=Local, the times shift correctly but there's no per-row label reminding me 'job fires in UTC, shown in your time' — easy to forget which clock I'm reading after scrolling through 4 jobs.",
    "The commented-out job '#0 4 * * *' is correctly treated as a comment, but I half-wanted a hint that it's a *disabled job* vs a prose comment — minor."
  ]
}
```
