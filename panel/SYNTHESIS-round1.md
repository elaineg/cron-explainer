# Cron-Explainer — Panel SYNTHESIS Round 1 (timezone-aware next-run feature)

Run: 20260618-103919-daily. Tested cold against http://localhost:3021 (local prod server).
Feature under test: TWO tz selectors — SOURCE ("This schedule runs in") + DISPLAY ("Show times in"),
"Runs in X · shown in Y" line on mismatch, privacy line. Validator + verifier already PASSED (174 unit + 129 e2e).

## Score table

| Persona | In-audience | Advocacy | Clarity | Value | Holds-at-8/7 reason |
|---------|-------------|----------|---------|-------|---------------------|
| Marcus  | yes (eng)   | 9 | Yes | Yes | — (at bar) |
| Tomás   | yes (ops)   | 9 | Yes | Yes | — (at bar) |
| Jules   | yes (ops/marketer) | 9 | Yes | Yes | — (at bar) |
| Priya   | yes (eng)   | 8 | Yes | Yes | source block noisy; invalid-expr no error msg (pre-existing) |
| Wen     | yes (data)  | 8 | Yes | Yes | **split-selector discoverability**; inverted ?tz= API/UI; no CSV (oos) |
| Elena   | yes (mgr)   | 8 | Yes | Yes | can't enter claimed-timestamp y/n (oos backlog); prev-run small |
| Sam     | yes (PM)    | 8 | Yes | Yes | **split-selector proximity/labeling on mobile**; inverted ?tz= |
| Rob     | soft (designer occasional) | 8 | Yes | Yes | **selectors far apart**; API block noise |
| Aisha   | soft (designer craft) | 8 | Yes | Yes | gray helper pile-up under source pills; doubled display-tz line |
| Dana    | non-fit (simple marketer) | 7 | Yes | Yes | English box buried (pre-existing layout); tz clutter for her simple need |

In-audience-at-9: 3/9 (Marcus, Tomás, Jules). Clarity+Value: 10/10 Yes (feature is universally understood + valued).

## Grouped findings

### A. CORE FIXABLE (feature-introduced, in-scope) — split-selector proximity / discoverability
Cited by Wen, Sam, Elena, Rob, Aisha, Priya (6 in-audience). SOURCE selector sits up by the cron input;
DISPLAY selector is buried down inside the NEXT 5 RUNS card. Several testers initially saw only ONE tz
control and nearly concluded the "show in my tz" half was missing (Wen). On mobile both look identical
(Local/UTC pills + combobox) and which-is-which costs a scroll (Sam, Elena). The "Runs in X · shown in Y"
line is what rescues legibility once both are seen — but the two controls must read as ONE paired concept.
FIX: visually pair the two selectors (e.g. a single "Runs in __ · show in __" row, or place DISPLAY adjacent
to SOURCE / cross-reference them) so the source→display relationship is obvious without hunting. This is the
core legibility risk the feature introduced and the gating defect.

### B. SECONDARY FIXABLE (feature-introduced) — gray helper-line pile-up under source pills
Aisha + Priya. Three stacked same-weight gray lines under the SOURCE pills ("Servers usually run cron in UTC…",
the dialect "5-field Unix/6-field Quartz…" help, and the privacy "nothing is sent" line) read as one
undifferentiated block; the DIALECT helper is misplaced (belongs under DIALECT, not under the tz pills).
FIX: regroup — dialect helper under DIALECT; keep only the UTC nudge with the source control; give the
privacy line its own breathing room. Cheap spacing/grouping change.

### C. MINOR (feature-adjacent footgun) — inverted ?tz= meaning API vs UI permalink
Wen + Sam. UI permalink uses ?tz= for DISPLAY and ?src= for SOURCE; the API uses ?tz= for the SOURCE.
A hand-edited link means different things in the two surfaces. Real but lower-severity; the Developers note
already discloses it. Consider aligning or clarifying, but not gating.

### D. NON-GATING (pre-existing / out-of-scope / non-fit preference)
- Invalid-expression shows no field-level error message (Priya) — PRE-EXISTING parser-UX, backlog.
- No claimed-timestamp "would it have fired at 3:07?" yes/no (Elena) — OUT-OF-SCOPE feature request, backlog.
- English-generator box buried below raw-cron decoder + "hide tz behind Advanced" (Dana) — pre-existing
  layout + a non-fit's ask that conflicts with the in-audience value of surfacing tz; NOT chased.
- No CSV/bulk export (Wen) — out of scope.
- API/Developers block is long (Rob) — harmlessly ignorable.

## Decision
Fix A (gating) + B (cheap, same area) this round. C is borderline — note for backlog, not gating.
D items are pre-existing/oos/non-fit and do not gate per the audience-weighted DEEPEN bar.
Re-test in round 2: the 6 sub-9 in-audience + soft personas touched by the fix (Wen, Sam, Elena, Rob, Aisha,
Priya); carry forward Marcus, Tomás, Jules (passing, untouched) and Dana (non-fit, non-gating).
