# Cron-Explainer — Panel SYNTHESIS Round 2 (timezone-aware next-run feature)

Run: 20260618-103919-daily. Re-test after Fix A (pair the two tz selectors) + Fix B (regroup helper lines).
Delta re-test: the 6 sub-9 in-audience/soft testers touched by the fix. Passing/untouched carried forward.

## Score table (audience-weighted)

| Persona | In-audience | R1 adv | R2 adv | Clarity | Value | Status |
|---------|-------------|--------|--------|---------|-------|--------|
| Marcus  | yes (eng)   | 9 | 9 (carried) | Yes | Yes | at bar |
| Tomás   | yes (ops)   | 9 | 9 (carried) | Yes | Yes | at bar |
| Jules   | yes (ops)   | 9 | 9 (carried) | Yes | Yes | at bar |
| Priya   | yes (eng)   | 8 | **9** | Yes | Yes | fixed |
| Wen     | yes (data)  | 8 | **9** | Yes | Yes | fixed (gating discoverability resolved) |
| Elena   | yes (mgr)   | 8 | **9** | Yes | Yes | fixed (paired card unambiguous on mobile) |
| Sam     | yes (PM)    | 8 | **9** | Yes | Yes | fixed (mobile which-is-which resolved) |
| Rob     | soft (designer) | 8 | **9** | Yes | Yes | fixed ("put them next to each other" satisfied) |
| Aisha   | soft (designer craft) | 8 | **9** | Yes | Yes | fixed (helper pile-up resolved) |
| Dana    | non-fit     | 7 | 7 (carried) | Yes | Yes | non-gating non-fit |

In-audience-at-9 trajectory: R1 3/9 → R2 9/9. Clarity+Value: 10/10 Yes both rounds.

## What the fix resolved
- **Fix A (gating):** the two tz selectors are now PAIRED in one grouped/bordered row near the input
  ("RUNS IN" / "SHOW TIMES IN" each labeled). Every tester who hit the split-selector discoverability
  defect (Wen, Sam, Elena, Rob, Priya) confirms both controls are now visible together at once, including
  on 375px mobile — source-vs-display is unambiguous at a glance. The "Runs in X · shown in Y" line still
  appears only on mismatch (the restraint testers liked is preserved). Permalink round-trip intact.
- **Fix B (craft):** dialect format-help moved under DIALECT; only the UTC nudge stays with the source;
  privacy line given its own spacing. Aisha confirms the gray pile-up under the source pills is resolved.

## Residual caps (ALL non-gating — not feature-introduced fixable defects)
1. Inverted `?tz=` meaning between API (source) and UI permalink (display) — Wen, Sam. Feature-adjacent
   footgun, already disclosed in the Developers note; not a legibility blocker. → BACKLOG (most-cited residual).
2. Claimed-timestamp yes/no ("would it have fired at 3:07?") — Elena. OUT OF SCOPE feature request. → BACKLOG.
3. "Other…" IANA combobox placeholder reads like a generic fallback, not a searchable city box — Sam. Minor
   pre-existing affordance polish. → BACKLOG.
4. Display tz named twice (NEXT 5 RUNS header + "shown in" line) — Aisha cosmetic; she still scored 9. → BACKLOG.
5. Invalid-expression field-level error message — Priya, PRE-EXISTING parser-UX. → BACKLOG.

## Verdict: PASS (audience-weighted)
9/9 in-audience personas advocate ≥9 with clarity+value=Yes. The timezone feature is unanimously understood
and valued (10/10 clarity+value). Every FIXABLE in-audience defect the feature introduced (the split-selector
source-vs-display legibility risk + helper pile-up) was fixed and re-verified. All residuals are
pre-existing / out-of-scope / feature-adjacent backlog items, none a defect in the new feature. Plateau guard
N/A (round produced full resolution, not a stall). SHIP-ON-OBJECTIVE-MET satisfied.
