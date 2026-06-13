# Panel synthesis — cron-explainer round 3

URL tested: https://cron-explainer-2lpg23r0c-elainegao.vercel.app
Exit bar: ≥9/10 advocacy ≥9 AND Yes/Yes. **Result: 9/10 at bar — exit condition MET.**
(Delta round: re-tested the 3 below-bar testers + 3 passers whose concerns the round-3 fixes touched; 4 untouched passers carried forward.)

## Score table (round 2 → round 3)

| # | Persona | Clarity | Value | Advocacy | Prior concerns | At bar? | Source |
|---|---------|---------|-------|----------|----------------|---------|--------|
| 1 | Priya | Yes | Yes | 9 → **8** ↓ | some (expr copy confirms; LINK copy still silent) | no | round 3 |
| 2 | Marcus | Yes | Yes | 9 → **10** | all (stale-output fully fixed) | YES | round 3 |
| 3 | Wen | Yes | Yes | 8 → **9** | all (invalid tz → 400; UI/API consistent) | YES | round 3 |
| 4 | Tomás | Yes | Yes | **10** | all | YES | carried (r2) |
| 5 | Dana | Yes | Yes | 8 → **9** | all (✓Copied! + friendly error) | YES | round 3 |
| 6 | Jules | Yes | Yes | 6 → **9** | all (stale-output cleared, can't copy stale) | YES | round 3 |
| 7 | Aisha | Yes | Yes | 9 → **10** | all (DEVELOPERS footer + deduped rel-time) | YES | round 3 |
| 8 | Rob | Yes | Yes | **9** | all | YES | carried (r2) |
| 9 | Elena | Yes | Yes | **9** | all | YES | carried (r2) |
| 10 | Sam | Yes | Yes | **10** | all | YES | carried (r2) |

**9/10 at bar.** Average advocacy of those re-tested rose sharply; the two round-2 dealbreakers (stale-output false-success, API tz silent coercion) are fully resolved and the dropped tester (Jules 6→9) recovered.

## The one miss + the self-inflicted regression being fixed before promotion

**T1 Priya (9→8, the allowed miss):** round-3 fix #2 added a visible "✓ Copied!" confirmation to the **cron-expression** Copy button (which fixed Dana T5), but the **permalink "Copy link"** button — the one Priya's PR-comment workflow depends on — still gives zero visible feedback. This is an inconsistency introduced this round (parity gap), not a pre-existing issue. It's a trivial one-line fix (apply the same confirmation hook the expression button uses to the link button). Although the 9/10 bar is already met without it, we do not knowingly ship a self-inflicted regression: a micro-fix + focused re-test of T1 is run before production promotion. If T1 returns to ≥9 the panel is 10/10; if anything regresses, the verified 9/10 build still ships.

## Accepted / out of scope (not blocking)
- T3 Wen: CSV/bulk multi-expression input — out of scope for a single-expression tool; recorded, not built.
- T6 Jules: "twice a day at 9am and 5pm" (multi-time NL phrase) doesn't parse — held her at 9 not 10; nice-to-have grammar extension for a future pass, not a blocker.
- Template hygiene (friction, not app bug): `apps/*/AGENTS.md` ships a confusing "this is NOT the Next.js you know → read node_modules docs" block that reads like a prompt injection; a tester correctly ignored it. Belongs in `templates/next-base`, fleet-wide — log to friction/backlog.

## Round-3.1 micro-fix (one item)
1. **Copy-link button shows the same "✓ Copied!" confirmation as the expression button** (T1 — parity fix). Then promote to production and re-test T1.
