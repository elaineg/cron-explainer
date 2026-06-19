Jules — Content & community marketer, medium tech, 50/50 desktop/mobile. Round 1.

I landed here to translate "every 6 hours on weekends" for a self-hosted scheduler
without making an account. That exact phrase worked: typed it in the plain-English box,
got `0 */6 * * 0,6` plus a readback ("On the hour, every 6 hours, only on Sunday and
Saturday") and next run times. Then tried both modes. No login asked, "Runs entirely
in your browser — nothing is sent" reassured me.

```json
{
  "name": "Jules",
  "clarity": "Yes",
  "value": "Yes",
  "advocacy": 9,
  "advocacy_reason": "It nailed my actual job in one shot — English -> cron with no account, and the readback let me trust it. The CRONTAB FILE mode reading my whole file line-by-line (4 JOBS · 2 COMMENTS · 1 INVALID LINE), keeping comments attached and flagging the bad line with a real reason, is genuinely better than crontab.guru for auditing a file. Timezone source/display split is exactly the gotcha I hit with server cron. Not a flat 10 only because cron isn't a daily task for me and the dense developer/API block at the bottom is noise for a marketer — but I'd recommend it unprompted to anyone wiring up a bot.",
  "found_crontab_mode": "Yes",
  "most_important_quote": "Runs entirely in your browser — nothing is sent.",
  "bugs_or_friction": [
    "None blocking. The bidirectional English<->cron is the killer feature but the 'Or describe a schedule in plain English' box sits BELOW the cron box and timezone panel — I almost missed that I could go English-first; consider surfacing it higher for non-devs.",
    "The DEVELOPERS / API paragraph at the very bottom is dense jargon ('?tz= sets execution/source timezone') that a marketer reader bounces off; fine to keep but it shouldn't be the last thing on a tiny mobile screen.",
    "Copy verified working (clipboard got the expression); label stays 'Copy link' on permalink button rather than flashing 'Copied' — minor confirmation polish."
  ]
}
```
