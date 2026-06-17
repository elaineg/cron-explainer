# Jules — Content & community marketer

**Task:** translate "every 6 hours on weekends" to cron for a self-hosted scheduler, no account.

## 1. Advocacy — 9/10. Yes, I'd recommend it, unprompted.
I'd drop this in our Discord and team Notion the next time someone asks "wait, is it `0,6` or
`6,0`?". My exact job worked on the first try: I typed "every 6 hours on weekends" into the
plain-English box and got `0 */6 * * 0,6` plus "On the hour, every 6 hours, only on Sunday and
Saturday" AND the next 5 run times in my local TZ. No login, no paywall, instant. That's the
whole pitch and it delivers. Translate-to-Quartz gave me `0 0 */6 ? * SUN,SAT` — the correct
6-field Quartz form with `?` and named days, which is exactly the dialect my scheduler wants and
the thing I'd normally fat-finger. Not a 10 only because the inline "Translate to" result felt
slightly buried below the fold and I almost missed there was a one-click "Use" to swap it in.

## 2. Value clear in 30s? — YES.
The H1 "Cron Explainer" + subhead "Paste a cron expression and see what it means in plain
English... or describe a schedule in English and get the cron expression generated... Supports
Unix, Quartz/Spring, and AWS EventBridge" told me everything. The pre-filled example and the
clickable suggestion chips ("every 30 minutes", "9am every monday") made it obvious how to drive
it. I knew what it did and that it covered my dialect before I touched anything.

## 3. Brutal friction.
Biggest: the **Translate-to output is easy to miss**. The Quartz string + "Use"/"Copy" buttons
render inside the "IN PLAIN ENGLISH" card, lower on the page than where my eyes were (the cron
field + dialect toggle at top). On mobile especially it's a scroll away. If translation is now a
headline feature, it deserves to surface nearer the expression field or echo into it on click.
Smaller nits: (a) the top "DIALECT Unix/Quartz/AWS" toggle and the "Translate to" buttons look
like two different mechanisms — took me a beat to realize one sets the *input* dialect and the
other converts the *result*; a one-word label clarifying that would help. (b) Nothing actually
broke — copy/permalink worked, mobile (375px) was clean, TZ handling was correct.

## Discoverability of dialect selector + Translate control
**FOUND BOTH UNPROMPTED on cold load.** On first screenshot, before any hint, I could see the
"DIALECT Unix | Quartz | AWS" toggle directly under the expression field, and the "Translate to
Quartz | AWS" control inside the plain-English result card. Neither required being told it exists.

```json
{"tester": 4, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Translate-to result (Quartz string + Use/Copy) sits below the fold and is easy to miss", "Input 'DIALECT' toggle vs output 'Translate to' read as two confusable mechanisms"], "priorConcernsAddressed": "n/a"}
```
