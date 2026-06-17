```
clarity: Yes
value: Yes
advocacy: 9
```

# Tester 10 — Sam (PM, mobile-heavy)

Task: write a ticket specifying `0 9 * * 1`, paste cron + plain-English gloss + a shareable link so engineers AND stakeholders both get it.

## 1. CLARITY — Yes
- Title "Cron Explainer" + subhead "Paste a cron expression and see what it means in plain English, plus its next 5 run times — or describe a schedule in English" told me both directions in under 5s.
- Two input boxes ("Cron expression" / "Or describe a schedule in plain English") made it obvious it's bidirectional. I didn't have to think.

## 2. VALUE — Yes
- Today I do this by guessing on crontab.guru, then hand-typing an English gloss into the Asana ticket myself, with no link a stakeholder can click. This replaces all of that.
- Typed `0 9 * * 1` → got "At 09:00 AM, only on Monday" (paste-ready gloss) + next 5 runs with relative "in 3 days / in 1 month" — stakeholders love relative times.
- The killer feature: "SHARE THIS EXPRESSION" → `/e/0%209%20*%20*%201` with a Copy link button. I opened that URL cold in a fresh browser and it pre-filled the cron AND re-rendered the English + run times. That's the exact thing that makes a ticket look organized: engineers get the cron, stakeholders click the link.
- Bonus: an `/api/explain?expr=` endpoint is shown — an engineer can even script against it. I won't, but it signals quality.

## Holdback (biggest)
- "Copy link" copies the URL but gives no on-screen toast/confirmation in my run — on mobile between meetings I can't tell if the copy actually fired, and I won't open another tab to verify. A "Copied!" state would lock the 9 into a 10.
- Minor: timezone is "your timezone (America/Los_Angeles)" only — for a ticket shared org-wide I'd want a UTC toggle, since the gloss runs in the reader's tz and could confuse a remote stakeholder.

## Advocacy — 9
I'd drop this in our PM Slack unprompted the next time someone pastes a raw cron into a ticket. Only the silent copy + no-UTC keep it off a 10.
