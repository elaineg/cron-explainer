# Panel synthesis — cron-explainer round 2

URL tested: https://cron-explainer-jlcwkro3v-elainegao.vercel.app
Exit bar: ≥9/10 advocacy ≥9 AND Yes/Yes. **Result: 7/10 at bar (up from 3/10). Two short — loop continues to round 3.**

## Score table (round 1 → round 2)

| # | Persona | Clarity | Value | Advocacy | Prior concerns | At bar? |
|---|---------|---------|-------|----------|----------------|---------|
| 1 | Priya | Yes | Yes | 8 → **9** | all (permalink + copy work) | YES |
| 2 | Marcus | Yes | Yes | 8 → **9** | some (parser fixed; stale-output half-fixed) | YES |
| 3 | Wen | Marginal→**Yes** | 5 → **8** | some (API now correct UTC; invalid-tz + no bulk) | no |
| 4 | Tomás | Yes | Yes | 9 → **10** | all (UTC toggle) | YES |
| 5 | Dana | Marginal→**Yes** | 6 → **8** | some (parser+chips fixed; no Copied! confirm) | no |
| 6 | Jules | Yes | Yes | 8 → **6** ↓ | **none** (stale-output unfixed, now worse) | no |
| 7 | Aisha | Yes | Yes | 9 → **9** | some (new elements crafted; 2 old nits remain) | YES |
| 8 | Rob | Yes | Yes | 8 → **9** | all (prev-run + toggle = reason to switch) | YES |
| 9 | Elena | Yes | Yes | 8 → **9** | all (previous-run line settles incident) | YES |
| 10 | Sam | Yes | Yes | 9 → **10** | all (Copied! pill + UTC toggle) | YES |

Big wins: the API timezone correctness bug is gone (Wen confirmed UTC/NY/LA + DST all correct, value Marginal→Yes), the UTC toggle and previous-run line landed cleanly (Tomás 10, Elena/Rob → 9), copy+permalink earned Sam a 10. Net +4 testers at bar.

## What still blocks the bar (3 testers below: T3, T5, T6)

### A. Stale output not cleared on parse failure — REGRESSION, now worse (T6 dropped 8→6 "none"; T2 "half-fixed") — RECURS, CRITICAL
The round-1 fix only added an amber error banner; it did NOT clear the prior result. Worse, with the new live Copy/permalink buttons you can now **copy a stale cron string while an error is on screen** (T6: "arguably worse"). Root cause is the cross-field case: when the **English phrase** fails to parse, the previously-generated cron stays in the cron input and keeps rendering its valid explanation + run times + active Copy button — so a valid-looking "success" sits right next to the red error. This is the single highest-leverage round-3 fix (it both recovers T6 and finishes T2's concern).
**Fix:** on ANY parse failure (cron field OR English field), clear/disable the entire result region — explanation, run-times, previous-run, permalink, AND the Copy buttons (disabled, not copyable) — until input is valid again. The error must be the only affirmative state on screen.

### B. Copy buttons lack a visible "Copied!" confirmation on the EXPRESSION button (T5 held at 8; T1 off a 10) — RECURS
T10 saw a "✓ Copied!" pill (so the *link* button confirms), but T1 (keyboard-first) and T5 (non-technical) got NO confirmation from the **cron-expression** Copy button — T5 couldn't tell it worked, holding her at 8. **Fix:** ensure BOTH copy buttons (expression + permalink) show the same visible "✓ Copied!" state for ~1.5s. Make it unmistakable for keyboard users.

### C. Invalid `?tz=` silently falls back to UTC with 200 instead of erroring (T3 held at 8) — data-hygiene trust
Wen (data analyst, value now Yes) is held at 8 because a bad IANA tz string returns 200 stamped UTC rather than a 400 error — invisible data transformation, her core distrust. **Fix:** if `?tz=` is present and not a valid IANA zone, return 400 `{ "error": "Unknown timezone: ..." }` (don't silently coerce to UTC). Keep default=UTC only when `tz` is absent. (Her second ask — CSV/bulk input — is out of scope; note it, don't build it.)

### D. Cheap craft polish (T7 at bar, but these are the only things off a 10; also general quality)
- A dangling raw dev note "API: GET /api/explain…" renders unstyled in the page body (T7) — style it as a proper, muted "Developers" line or move it into a small footer.
- Identical relative hints: for a schedule whose next 5 runs are far apart, all five show the same "in 3 days" text (T7) — make the relative hint reflect each run's actual offset (or drop it past the first when redundant).

### E. Not actionable / accepted
- T3's CSV/bulk-input ask: out of scope for this single-expression tool; record, don't build.
- T8's "address bar doesn't live-update as I type": minor; the explicit permalink + Copy link already cover sharing. Leave unless trivial.

## Round 3 fix list (each maps to named testers)
1. **Clear the ENTIRE result region (incl. disable Copy) on any parse error, including the English→cron cross-field case** (A — T6, T2). *Highest priority — recovers the dropped tester.*
2. **Visible "✓ Copied!" confirmation on BOTH copy buttons, esp. the expression button** (B — T5, T1).
3. **Invalid `?tz=` returns 400, not a silent UTC 200** (C — T3).
4. **Polish:** style the API/dev note; fix duplicated relative-time hints (D — T7).
