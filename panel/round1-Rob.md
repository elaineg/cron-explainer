Rob — Brand/visual designer, freelance. Uses cron rarely; comes back to decode `0 */4 * * *` and confirm next backup run.

CLARITY: Yes. Headline "Cron Explainer" + the subline "Paste a cron expression and see what it means in plain English, plus its next 5 run times" told me exactly what it is in 5 seconds. I pasted my real expression `0 */4 * * *` and got "On the hour, every 4 hours" plus the actual next 5 timestamps with "in 2 hours / in 6 hours" — that is precisely the thing I open this for. I'd tell a friend: "paste a cron line, it tells you what it means and when it next fires." The toggle SINGLE EXPRESSION / CRONTAB FILE is plainly labeled top-left; found it instantly.

VALUE: Yes (for my narrow occasional need). Today I either squint at crontab.guru or just guess and re-run my backup at a weird hour to confirm. This beats crontab.guru on one thing I actually care about: it shows the NEXT 5 real run times in my local timezone AND a "previous run" line, so I can confirm "yes my 4-hour backup already fired at 8am and next is noon" without doing mental math. The CRONTAB FILE mode parsed my whole 4-line file, flagged my typo line in red ("Not a valid cron expression... Expected at least 5 fields"), and split comments from jobs — nice, but honestly I almost never have a multi-line crontab to decode, so that mode is not for me. The single-expression + next-runs flow is the keeper.

ADVOCACY: 6. It does my one job well and it's free with no signup, which I respect. But I'd only recommend it to a developer friend, not unprompted — for me personally this is a once-every-few-months tool, so it doesn't earn a spot in my head the way a daily Figma/Photoshop utility would. The crontab-file mode (the new feature) is irrelevant to my workflow; it's clearly built for devops people. Nothing confused me and nothing broke — the score is purely "low recurrence for my line of work," not a quality knock. crontab.guru already exists and is the thing people reach for, so the next-run-times advantage isn't enough to make me evangelize.

found_crontab_mode: Yes

bugs_or_friction: none functional. The DEVELOPERS API block at the bottom is noise for me, but it's tucked away and harmless.

```json
{"name":"Rob","clarity":"Yes","value":"Yes","advocacy":6,"advocacy_reason":"Nails my one occasional need (decode + next run times, beats crontab.guru on showing next 5 runs in local tz) and it's free/no-signup, but it's a once-every-few-months tool for a visual designer so I wouldn't bring it up unprompted; the new crontab-file mode is squarely for devops, not me.","found_crontab_mode":"Yes","most_important_quote":"On the hour, every 4 hours — NEXT 5 RUNS: Fri Jun 19 12:00 PM (in 2 hours), Previous run: 08:00 AM (2 hours ago)","bugs_or_friction":["No functional bugs found","Both modes work, invalid lines flagged clearly in red","DEVELOPERS API section is noise for a non-dev but harmless"]}
```
