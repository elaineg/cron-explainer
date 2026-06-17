```
clarity: Yes
value: Yes
advocacy: 8
```

# Round 1 — Tester 6 (Jules, content/community marketer, medium tech, 50/50 mobile)

**Task:** generate cron from "every 6 hours on weekends", confirm no login, check mobile, try a phrase it can't parse.

## 1. CLARITY — Yes
- Header "Cron Explainer" + subtitle "describe a schedule in English and get the cron expression generated for you" told me exactly what it does in ~3s. That's the whole reason I landed here.
- Two clearly-labeled boxes ("Cron expression" / "Or describe a schedule in plain English"). No ambiguity.

## 2. VALUE — Yes
- Typed "every 6 hours on weekends" → got `0 */6 * * 0,6` instantly, read back as "On the hour, every 6 hours, only on Sunday and Saturday". Correct. That's exactly what I needed to paste into my webhook bot.
- ZERO login. No account, no email gate. As someone allergic to logins for a 30-second job, this is the win.
- Mobile (375px) is genuinely good: everything stacks, the result drops into the top field, "Next 5 runs" in MY timezone is a nice sanity check I didn't expect.
- Bonus I'd actually use: shareable `/e/...` URL (drop in a Discord thread) and a documented `/api/explain` endpoint.
- Error handling works: nonsense ("whenever my coffee is ready") returns "Couldn't understand that schedule. Try: ..." with 3 real examples. Helpful, not a dead end.

## Holdbacks
- **Stale result bug:** when a phrase fails, the error shows BUT the cron field above still displays the previous/default `*/15 9-17 * * MON-FRI` with full plain-English + run times. Looks like it succeeded with a wrong answer — I had to read carefully to realize it errored. Confusing.
- "twice a day at 9am and 5pm" — common phrasing — wasn't understood. Parser is narrower than the confident pitch implies.

## Single biggest holdback
When it can't parse a phrase, the old valid-looking cron + schedule stays on screen alongside the error — that mixed signal is the one thing that'd make me distrust the output enough to double-check it elsewhere.
