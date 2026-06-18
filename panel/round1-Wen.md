# Wen — Round 1
- advocacy: 8
- clarity: Yes
- value: Yes

## What I did
Cold open: "Cron Explainer" + the one-line description ("see what it means in plain English,
plus its next 5 run times") told me what this is in <10s. Pasted my real job `0 6 * * *`.
Got "At 06:00 AM" + next 5 runs labeled "NEXT 5 RUNS — America/Los_Angeles". Then the core
test: set SOURCE ("THIS SCHEDULE RUNS IN") = UTC, left DISPLAY ("Show times in") = Local.
Cross-checked the math two ways: the /api/explain?tz=UTC endpoint returns raw `06:00:00.000Z`
ISO instants, and my own zoneinfo conversion of 6am UTC → LA = 11:00 PM prev day. The UI
showed exactly 11:00 PM. Numbers are honest — no invisible transformation, which is the
thing I distrust most.

## Friction (brutally honest)
- The two selectors are physically far apart: SOURCE sits up by the input, DISPLAY is buried
  down in the NEXT 5 RUNS block. On first pass I only saw ONE timezone control and almost
  concluded the "answer 6am-in-my-tz" feature was missing. I had to scroll to find the second
  one. They should be visually paired, or at least the source label should hint a display
  control exists below.
- API/UI param naming is INVERTED and that's a real footgun: the docs literally say "the API
  ?tz= sets the execution/source timezone (default UTC); in the UI ?tz= sets the display
  timezone and ?src= sets the source timezone." If I script a dbt-schedule audit against the
  API and then eyeball it in the UI, the same query string means different things. As a data
  person I'd get burned by this. Pick one meaning for ?tz=.
- "At 06:00 AM" stays the headline even when source=UTC — technically correct (it's the
  schedule's own definition) but for half a second it fights the 11:00 PM list below. A
  micro-label like "(06:00 in UTC)" on the plain-English line would kill the ambiguity.
- No CSV/bulk export. I audit many DAGs at once; I'd want to paste a column of expressions
  or get the next-runs as CSV. One-at-a-time is fine for spot checks, not for a sweep.

## On the timezone feature specifically
This nailed my exact worry. With SOURCE=UTC / DISPLAY=Local the tool showed the disclosure
line "Runs in UTC · shown in America/Los_Angeles" (only appears when they differ — good
restraint), and converted the 6am-UTC job to 11:00 PM my time, matching my independent
zoneinfo check. The permalink even persisted `?src=UTC`, so I can paste a stakeholder the
exact "no, it fires at 11pm your time" proof. Source-vs-display is the RIGHT mental model and
once both controls are in view it's clear. The only legibility risk is discoverability of the
second selector (see friction). Privacy line "Runs entirely in your browser — nothing is sent"
plus the raw-UTC ISO API earns my data trust. Not a 9 only because of the split-selector
discoverability and the inverted API/UI ?tz= naming — both fixable.
