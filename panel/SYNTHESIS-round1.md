# Cron Explainer — Panel SYNTHESIS Round 1

Feature under test: NEW "Explain a whole crontab file" mode (SINGLE EXPRESSION · CRONTAB FILE toggle).
App tested locally at http://localhost:3210 (production build).
ICP: developers / devops / data engineers. Out-of-ICP roster members flagged.

## Score table

| Tester | ICP | Clarity | Value | Advocacy | Found crontab mode | Most important quote |
|--------|-----|---------|-------|----------|--------------------|----------------------|
| Priya (sr backend eng) | in | Yes | Yes | 8 | Yes | "Whole-crontab mode beats crontab.guru's one-at-a-time; held back only by no K8s UTC nudge + heavy vertical scroll." |
| Marcus (frontend eng) | in | Yes | Yes | 8 | Yes | "The English parser is brittle — 'at midnight every day' fails with no suggestion; that's the exact moment I'd bounce to Google." |
| Wen (mktg data analyst) | in | Yes | Yes | 9 | Yes | "It kills my real fear: 0 6 * * * on a UTC server — RUNS IN=UTC/SHOW=LA showed 11pm PDT correctly." |
| Tomás (ops analyst) | in | Yes | Yes | 9 | Yes | "Browser-only, IT can't install-block it, zero external requests — safe for company config." |
| Dana (demand-gen mktr) | borderline | Yes | Yes | 8 | Yes | "Typed 'every Monday at 8am', copied 0 8 * * 1 — my whole job in 15s; but loose phrasing gets rejected with no fix." |
| Jules (content mktr) | borderline | Yes | Yes | 9 | Yes | "Beats crontab.guru for auditing a whole file + the timezone split nails the server-cron gotcha." |
| Aisha (product designer) | borderline/in | Yes | Yes | 9 | Yes | "Genuinely considered craft — but the 'de-emphasized' comment/env rows aren't actually dimmed, so jobs don't pop." |
| Rob (visual designer) | OUT | Yes | Yes (narrow) | 6 | Yes | "Does my one job well, free, no signup — but it's a once-every-few-months tool for a designer; file mode is built for devops, not me." |
| Elena (eng manager) | in | Yes | Yes | 8 | Yes | "Incident reviews are about PAST runs; it only shows NEXT runs, so I still back-compute." |
| Sam (product manager) | borderline | Yes | **No** | 5 | Yes | "I can't copy the plain-English gloss or get a shareable crontab link — it fails my one job." |

Advocacy mean: 7.9. Found crontab mode: 10/10 (no discoverability defect).

## Exit-bar status (audience-weighted: ~9/10 at advocacy >=9 AND clarity=Yes AND value=Yes)

Advocacy >=9 with clarity+value=Yes: **4/10** (Wen, Tomás, Jules, Aisha).
Clarity=Yes: 10/10. Value=Yes: 9/10 (Sam = No).
**Verdict: CONTINUE — bar not met.**

In-ICP core (Priya, Marcus, Wen, Tomás, Elena): only 2/5 at 9+ (Wen, Tomás). The three in-ICP holdouts (Priya 8, Marcus 8, Elena 8) all clear clarity+value and cite specific, fixable gaps — not fundamental rejection. This is a fixable round, not a stall.

## Complaints grouped by cause

### A. Core action hard to find / output not usable (TRUST + WORKFLOW) — highest priority
- **No copy of the plain-English gloss; no copy/export/share in crontab-file mode** — Sam (value=No, adv 5, BLOCKER), Wen (adv 9 holdout), Sam's named job is paste-gloss-into-ticket. Single mode's "Copy" grabs raw cron, not the English sentence. Recurs across 2 personas, is the only value=No, and is the single biggest advocacy drag.

### B. Natural-language parser brittleness (single-expression mode)
- "at midnight every day", "every 15 minutes during business hours", "every monday morning" all fail with no suggestion/fallback — Marcus (adv 8, his #1), Dana (adv 8, her top friction). On parse failure the prior valid cron stays in the box (ambiguous) — Marcus. Recurs across 2 personas; it's the bounce-to-Google moment.

### C. Timezone default for server/inherited crontabs
- Defaults to local tz; inherited/server crontabs run in UTC — Tomás (adv 9 holdout, "off by 7 hours until I find the toggle"), Priya (no K8s-CronJob-defaults-to-UTC nudge), Elena (UTC should be more prominent on mobile). Recurs across 3 personas. The control EXISTS and is correct (Wen/Priya/Tomás all confirmed DST-correct conversion) — the gap is default + discoverability, not correctness.

### D. Craft: de-emphasis not visually real
- In crontab-file mode the comment/env row TEXT renders at the same near-black as job rows; de-emphasis lives only in the small gray type label, so valid jobs don't pop — Aisha (adv 9 holdout, craft specialist). Single-persona but the named designer; high-signal.
- Mode toggle is a low-contrast text pill that could read as static label — Aisha. (Note: discoverability was NOT a problem — 10/10 found it — but the visual affordance is weak.)

### E. Past-run view (feature gap, lower priority)
- Incident-review use wants "did it fire at 3:14am yesterday?" — only next-runs shown — Elena (adv 8), Priya noted a previous-run line exists in single mode (Rob used it), so partial coverage already there; gap is surfacing it in file mode / clearer past timeline.

### F. Dev chrome noise for marketers (low priority)
- DIALECT/UTC controls + bottom DEVELOPERS/API block read as jargon for marketers — Dana, Jules. Borderline-ICP cosmetic; do not over-rotate.

### G. Vertical scroll / density (low priority)
- Per-job next-5-runs with no compact toggle makes long crontabs scroll-heavy — Priya.

## Out-of-ICP documentation
- **Rob (freelance visual designer) — advocacy 6, the documented non-fit.** Rates clarity+value Yes for his narrow occasional need but explicitly "wouldn't bring it up unprompted; file mode is built for devops, not me." This is a legitimate roster-fit floor, not a product defect. Excluded from the pass numerator as an expected out-of-ICP holdout.
- Dana/Jules (marketers) and Sam (PM) are borderline-ICP; their scores are counted normally. Sam's value=No is a real workflow blocker (copy/share), NOT a roster-fit issue, and must be fixed.

## Recommended fixes for next round (mapped to complaints)
1. **A (do first):** make the plain-English description copyable in BOTH modes; add copy/export of the whole explained crontab (and ideally a permalink for file mode). Resolves Sam (value=No→Yes) + lifts Wen toward 10. Highest leverage.
2. **B:** broaden NL parser coverage (midnight/business-hours/"morning") + on failure show a suggestion and don't silently leave the stale cron. Lifts Marcus + Dana.
3. **C:** smarter/clearer tz default for pasted files (detect server-UTC intent or surface a prominent "these times are in LOCAL — switch to UTC for server crontabs" nudge). Lifts Tomás→10, Priya, Elena.
4. **D:** actually dim comment/env row text (not just the label) so jobs pop; strengthen the toggle's affordance. Lifts Aisha→10.
5. Defer E/F/G unless cheap.
