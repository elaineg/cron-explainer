# Sam — Product manager

**Context:** I write tickets specifying recurring jobs. I want to paste a cron expression
PLUS a plain-English gloss PLUS a shareable link so engineers AND stakeholders both get it.
Today I do this by Googling "crontab guru", eyeballing the gloss, retyping it into Notion,
and there's no link — stakeholders just see `*/15 9-17 * * MON-FRI` and glaze over.

## 1. Advocacy: 9/10 — yes, I'd recommend it unprompted
To every PM and EM I work with, and I'd drop the permalink straight into a ticket. It nails
my exact job: the **IN PLAIN ENGLISH** card reads "Every 15 minutes, between 09:00 AM and
05:59 PM, Monday through Friday" — that's stakeholder-ready copy I can paste verbatim. The
**PERMALINK** ("Copy link" → `/e/<cron>`) loads in a fresh tab and restores the expression +
gloss + next-5-runs, so engineers can click through. Crontab guru gives me none of that
shareability. Translate-to-Quartz showed me `0 */15 9-17 ? * MON-FRI` with a Copy button —
handy when our Spring jobs and Unix jobs disagree. Not a 10 only because the share artifact
is a bare link with no preview/title; pasted in Slack it's just a long URL, not a card.

## 2. Value clear in 30s? YES
Subhead says it plainly: "Paste a cron expression and see what it means in plain English,
plus its next 5 run times... Supports Unix, Quartz/Spring, and AWS EventBridge." The
prefilled example already showing a real gloss + run times means I understood it before
clicking anything. No jargon wall, no signup. I knew who it's for immediately: anyone
reading or writing a schedule.

## 3. Brutal friction
Biggest: the **shareable link is unbranded and previewless**. When I paste
`http://localhost:3210/e/*%2F15%209-17...` into a ticket or Slack, stakeholders see an ugly
percent-encoded URL, not "Every 15 min, weekdays 9–5 → [link]". The whole point for me is
looking organized; a raw encoded URL slightly undercuts that. A short slug or an OG preview
(showing the gloss as the link title) would make me share it everywhere.
Minor: "Translate to" reveals an inline result instead of swapping the input — took me a
beat to realize it wasn't broken; the **Use** button label is the only hint it's actionable.
Minor: clipboard read was blocked in my test env but the button flipped to "✓ Copied!" and
the click handler fired — copy verified visually, clipboard read blocked in test env, NOT a
bug.

## Discoverability (asked explicitly)
I found the **DIALECT selector** (Unix/Quartz/AWS) UNPROMPTED on cold load — it sits right
under the input on both mobile and desktop. I also found the **Translate to** control
UNPROMPTED inside the plain-English card. Both were obvious without being told.

```json
{"tester": 0, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Permalink is a raw percent-encoded URL with no OG preview/title — looks ugly pasted in Slack/tickets, undercuts the 'look organized' value", "'Translate to' shows an inline result rather than swapping the input — momentarily reads as broken until you spot the 'Use' button"], "priorConcernsAddressed": "n/a"}
```
