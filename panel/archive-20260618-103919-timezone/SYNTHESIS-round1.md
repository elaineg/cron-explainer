# Cron Explainer — Panel SYNTHESIS Round 1 (multi-dialect add-feature)

Run: 20260617-153950-multidialect · tested against http://localhost:3210 (local prod server, edge economy)
Feature judged: multi-dialect support (Quartz/Spring + AWS EventBridge), always-visible DIALECT selector, one-click TRANSLATE between dialects.

## In-audience set (people who actually read+write cron in their workflow)
Priya (backend eng), Marcus (frontend eng — GH Actions/Vercel cron), Wen (data analyst — dbt/Airflow cron), Tomás (ops analyst — inherited crontabs), Jules (self-hosted scheduler config), Elena (EM — incident cron-blame). These 6 GATE at the 9+ advocacy bar.
Audience non-fits (carry, do not gate; must still find value legible): Dana (marketer), Rob (visual designer), Aisha (designer judging craft), Sam (PM pasting tickets).

## Per-tester results
| Persona | Audience | Score | Value clear | Their one blocker |
|---|---|---|---|---|
| Priya — backend eng | IN | 8 | Y | `/api/explain` auto-detect silently mis-parses bare 6-field Quartz (`0 0 12 * * ?` → "12:00 AM, day 12"); `&dialect=quartz` fixes. UI is correct; API-only. |
| Marcus — frontend eng | IN | 9 | Y | None real; wishes generator echoed how it parsed the English. |
| Wen — data analyst | IN | 5 | Y | **UTC/Local toggle is broken in UI** — for `0 6 * * *` on NY machine, UTC view still shows 06:00 instead of 10:00 (API returns correct `10:00:00Z`; UI relabels without reformatting). Also no manual TZ picker. |
| Tomás — ops analyst | IN | 9 | Y | Minor: `/api/explain` footer made him fear data is sent; wants a "runs in your browser" trust line. |
| Jules — community mktr | IN-ish (self-host cron) | 9 | Y | Translate-to result sits below fold inside the card; easy to miss on mobile. |
| Elena — eng manager | IN | 9 | Y | Minor: Translate result shows in sub-card and does NOT update the main input; looked like it did nothing for a beat. |
| Dana — demand-gen mktr | OUT | 8 | Y | Dev-first paste box on top; English-input box (what she needs) is below — flip order. |
| Rob — visual designer | OUT | 8 | Y | None broken; "every 4 hours" gloss could spell out 12am,4am,8am. |
| Aisha — product designer | OUT | 8 | Y | Empty field renders as pink ERROR ("Enter a cron expression.") with a stale nonsensical hint; should be neutral resting prompt. |
| Sam — product manager | OUT | 9 | Y | Shareable link is raw %-encoded URL, no OG/slug — ugly pasted in Slack. |

## Discoverability of the NEW headline features
STRONG. All 10 testers found the DIALECT selector UNPROMPTED on cold load (segmented Unix/Quartz/AWS pills directly under the input, above the fold, on desktop AND 375px mobile). All 10 also found the TRANSLATE control unprompted ("Translate to: Quartz | AWS" in the result card). Caveat (Elena): Translate only appears once you've pasted/typed an expression, so a cold homepage visitor doesn't see translation exists until they enter something — acceptable, but a discoverability ceiling. The feature is NOT buried.

Quality of the feature itself read well: non-destructive Use/Copy (doesn't nuke input — praised by Wen, Tomás, Aisha), honest "can't represent L/W/# in 5-field cron" warning on lossy translate (Aisha), correct Quartz/AWS round-trips (Tomás, Jules, Rob, Sam), 7-field Quartz auto-detect (Aisha).

## Advocacy summary
In-audience: Marcus 9, Tomás 9, Jules 9, Elena 9 (4 at bar) · Priya 8 · **Wen 5**.
Out-of-audience (carried): Sam 9, Dana 8, Rob 8, Aisha 8 — all found value legible (gate satisfied for non-fits).

## Dominant blocker(s), ranked
1. **UTC/Local toggle relabels without reconverting the displayed run times (UI bug).** Wen (in-audience, 5/10) — this is the gating blocker. For `0 6 * * *` the UTC view shows 06:00 instead of 10:00 on a NY browser; the API returns the correct `10:00:00Z`, so the conversion logic exists but the UI doesn't apply it to the rendered clock. A TZ-correctness tool that shows wrong times in its own TZ toggle is a trust-killer for the data/devops audience whose whole reason to use it is timezone sanity-checking.
2. **`/api/explain` auto-detect mis-parses bare 6-field Quartz** (Priya, in-audience, knocked her to 8). Confidently-wrong output (`0 0 12 * * ?` → "12:00 AM, on day 12") when no `&dialect=` is passed. UI is correct; this is API-surface only, but the API is an advertised dev feature.
3. **Translate result is non-obvious that it did anything** — appears in a sub-card below the fold and does not update the main input (Elena, Jules). Two in-audience testers momentarily thought Translate was a no-op. Not blocking on its own but compounds.

Out-of-scope / PARK candidates (not blockers): manual timezone picker (Wen), OG-card/slug permalinks (Sam), English-first input reorder (Dana), neutral empty-state (Aisha), client-side trust line (Tomás).

## Recommendation: FIX-AND-RETEST
The headline multi-dialect feature is discoverable, well-crafted, and lands with the audience — 4 in-audience advocates are already at 9 and all non-fits find it legible. But the exit bar (in-audience advocates at 9+) is NOT met: Wen is at 5 purely on a real UTC/Local UI bug, and Priya is held at 8 by the Quartz API mis-parse. Both are correctness regressions in functionality the cron audience specifically relies on, not taste gripes.

Specific fixes before retest:
1. **Fix the Local/UTC toggle to actually reconvert the displayed next-run clock times** (the API already computes UTC correctly — apply the same conversion to the UI's rendered times instead of just relabeling). This is the gating fix (Wen → expected 9).
2. **Make `/api/explain` auto-detect bare 6-field Quartz** (`0 0 12 * * ?`) so the API matches the UI's correct parse, OR have the API return the detected dialect + a note rather than a confidently-wrong Unix gloss (Priya → expected 9).
3. (Cheap, recommended) **Surface a clearer signal that Translate produced output** — e.g. scroll-to/highlight the translated result or echo it nearer the input so it doesn't read as a no-op (Elena, Jules).

After these, re-run an audience-weighted round 2. PARK the out-of-scope asks above.
