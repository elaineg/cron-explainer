# Wen — Marketing data analyst

## 1. ADVOCACY: 5/10
I'd recommend the *engine* but not for the one job I came for. The API and the plain-English
parsing are genuinely good — but the UTC/Local toggle, the single control my whole reason for
visiting depends on, is broken in the UI. I can't in good conscience tell a teammate "use this
to confirm your dbt job fires at 6am local not UTC" when its timezone toggle lies. I'd send the
API (`/api/explain?...&tz=`) to an engineer; I would NOT send the web UI to a non-engineer
stakeholder for the timezone check. Engine 8, the UI's headline trust-feature drags it to 5.

## 2. VALUE CLEAR within 30s? YES.
Title "Cron Explainer" + subhead "Paste a cron expression and see what it means in plain English,
plus its next 5 run times... Supports Unix, Quartz/Spring, and AWS EventBridge." That's exactly
my world. The sample `*/15 9-17 * * MON-FRI` pre-filled and the live "Every 15 minutes..."
explanation told me everything instantly. Today I do this in crontab.guru + manual UTC mental
math; this is faster — and it covers Quartz/AWS, which crontab.guru does not.

## 3. BRUTAL FRICTION
**Biggest (disqualifying for my use case): the Local/UTC toggle does NOT convert the run-time
clock.** For `0 6 * * *` with my machine on America/New_York (EDT, UTC-4), flipping to "UTC"
changes the header to "NEXT 5 RUNS — UTC" and the relative "14 hours ago → 18 hours ago", but
every row still reads **06:00 AM**. It should read **10:00 AM** in UTC. I proved the backend is
right: `GET /api/explain?expr=0 6 * * *&tz=America/New_York` returns `2026-06-18T10:00:00.000Z`
(= 6am NY = 10am UTC). So the math is correct; the UI toggle just relabels without reformatting.
This is the textbook "tool transforms time invisibly" trap I distrust, and it sits on the exact
feature I opened the app to use. Fix: render the UTC column as the actual UTC wall-clock.

Other friction:
- **No manual timezone picker** (zero `<select>` on the page). It only uses my browser's TZ. I
  can't verify "does this fire at 6am for the Tokyo stakeholder" without spoofing my OS clock.
  The API takes `&tz=<IANA>`; the UI should expose that as a dropdown.
- **Two buttons both labelled "AWS"** doing different things — the DIALECT selector "AWS"
  (re-interprets in place) vs the "Translate to AWS" (emits a new expr). Mildly confusing.

What's GOOD: the Translate result is shown as a separate line `AWS: 0 6 ? * MON-FRI *` with
Use/Copy — it does NOT silently overwrite my input. That non-destructive behavior is exactly
what a data-hygiene person wants. English→cron (`every weekday at 6am → 0 6 * * 1-5`) and the
documented API (400 on bad tz) both passed.

## DISCOVERABILITY (asked explicitly)
I found BOTH UNPROMPTED on cold load, above the fold:
- DIALECT selector: pill row "Unix | Quartz | AWS" directly under the expression box. Obvious.
- Translate control: "Translate to: Quartz | AWS" in the top-right of the IN PLAIN ENGLISH card.
  Clear once I had an expression. The target list correctly excludes the current dialect.
Neither needed hunting. Discoverable: yes.

```json
{"tester": 0, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 5, "topComplaints": ["Local/UTC toggle does not convert run-time clock — UTC view still shows 06:00 instead of 10:00 for a NY-interpreted 0 6 * * *; the exact feature I came to verify", "No manual timezone picker — UI is locked to browser TZ; can't check a job in a stakeholder's timezone (API has &tz= but UI doesn't expose it)"], "priorConcernsAddressed": "n/a"}
```
