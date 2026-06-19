# Wen — Round 2
- advocacy: 9
- clarity: Yes
- value: Yes
- prior concerns addressed: Partly — the gating discoverability gripe is fully fixed; the inverted API/UI ?tz= footgun and no-CSV remain.

## What I did
Cold open: both timezone controls were visible above the fold immediately — no scroll, no
hunting. Pasted my real job `0 6 * * *`. Set SOURCE ("RUNS IN") = UTC, left DISPLAY ("SHOW
TIMES IN") = Local. Both toggles sit side-by-side in one bordered row right under the input,
reading as a single "runs in X, show in Y" concept. The 6am-UTC job rendered as 11:00 PM
prev-day America/Los_Angeles — matches my independent zoneinfo math from round 1. The
mismatch line "Runs in UTC · shown in America/Los_Angeles" appeared only because they differ
(good restraint, unchanged). Also spot-checked the API: ?tz=UTC still returns raw 06:00:00Z
ISO instants — honest, no invisible transform.

## Friction (brutally honest)
- The ONE thing that kept me from a 9 last round — the split selectors — is resolved. Now I
  see both controls cold and never doubt the feature exists.
- Still inverted: API ?tz= = execution/source tz, but UI ?tz= = display tz (UI uses ?src=
  for source). If I script a DAG audit against the API and then eyeball it in the UI, the
  same query string means two different things. Real footgun for a data person; not a
  legibility blocker on the in-browser flow, so it doesn't sink the score, but I'd still pick
  one meaning for ?tz=.
- Still no CSV/bulk paste for sweeping many DAGs at once. Out of scope, fine for spot checks.
- "At 06:00 AM" remains the headline even at source=UTC. Mild — the mismatch line below
  resolves it now that both selectors are in view, but a "(06:00 in UTC)" micro-label would
  still kill the half-second ambiguity.

## On the timezone feature specifically
This is now exactly the mental model I want and it's discoverable on first paint: source vs
display, both controls paired, mismatch disclosed, math honest (11:00 PM LA for 6am UTC),
permalink persists ?src=UTC so I can hand a stakeholder the proof. The gating discoverability
defect is gone. I'm at 9 — I'd bring this up unprompted to anyone scheduling cron across
timezones. The remaining inverted-?tz= API/UI naming is the only thing between this and a 10.
