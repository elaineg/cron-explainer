# Rob — Brand/visual designer

**Who I am here:** I'm not a dev. I set up one `0 */4 * * *` backup cron for client deliverables ages ago and come back maybe once a month to remember what it does and when the next backup fires. That's my entire relationship with cron.

## 1. Advocacy: 8/10
I'd recommend it — but only to the right person. For ME, in my niche use, it did exactly what I needed instantly: pasted `0 */4 * * *`, got "On the hour, every 4 hours" and a clean list of the next 5 runs with "in 3 hours / in 7 hours" relative labels AND a "Previous run: ...04:00 PM (35 minutes ago)" line. That previous-run line is the thing — it answers my real question ("did my last backup already run?") without me doing date math. I'd tell a developer friend "just use this instead of crontab.guru" unprompted. I'd tell a fellow designer about it only if they happened to mention they touched a cron once. It's a dev/ops tool; that's the ceiling on my enthusiasm, not a flaw in the build. Not a 9 because it's genuinely not a tool I'll open weekly the way a backend dev would.

## 2. Value clear in 30 seconds? YES
The H1 "Cron Explainer" plus the subhead "Paste a cron expression and see what it means in plain English, plus its next 5 run times" told me precisely what it does. The field was even pre-filled with a sample so I saw a live decoded result before typing anything. Zero confusion, no signup, no clutter. I could explain it to a friend in one sentence.

## 3. Brutal friction
**Biggest thing:** honestly, nothing is broken — so the "biggest" gripe is mild. The phrase "On the hour, every 4 hours" is technically right but made me pause for a half-second ("on the hour" = at minute 0). For a fuzzy-memory user like me, "At minute 0, every 4 hours (12am, 4am, 8am, ...)" would've been instantly unambiguous. The next-runs list eventually shows me the actual clock times, so I got there, but the one-liner could spell out the hours.
Minor: the page is dense with dev stuff (DIALECT toggles, a "DEVELOPERS" API section, permalink) that I'll never use — fine for the target dev, slightly noisy for me, but it never blocked me.
Nice touch I didn't expect: typing a 4-field typo gave "it has 4 fields. Expected at least 5 fields: minute hour day-of-month month day-of-week" — that's the exact hint someone who forgot the syntax needs.

## Discoverability of dialect selector + Translate control
FOUND BOTH UNPROMPTED on cold load. The "DIALECT — Unix / Quartz / AWS" toggle sits right under the input, and "Translate to — Quartz / AWS" lives in the top-right of the plain-English result card. I clicked Translate→AWS and it correctly produced `AWS: 0 */4 ? * * *` (with the AWS `?` quirk) plus "Use" and "Copy" buttons. Worked first try. As a non-dev I don't need dialects, but they were obvious, not buried.

```json
{"tester": 1, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["plain-English one-liner 'On the hour' is mildly ambiguous vs spelling out the hours", "dev-oriented sections (DEVELOPERS API, dialect toggles) add mild noise for a non-dev"], "priorConcernsAddressed": "n/a"}
```
