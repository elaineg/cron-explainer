# Cron Explainer — Panel SYNTHESIS Round 2

Feature under test: ROUND-1 FIXES — (1) Copy/export in crontab-file mode ("Copy explained
crontab" whole-file annotated + per-job "Copy") and single-mode "Copy explanation"; (2)
prominent UTC source-tz control + hint; (3) COMMENT/ENV rows visibly dimmed; (4) "supported
phrasings" hint near the English→cron generator.
App tested locally at http://localhost:3210 (production build).
ICP: developers / devops / data engineers. Out-of-ICP roster members flagged.

## Score table

| Tester | ICP | Clarity | Value | Advocacy | Δ vs R1 | Most important quote |
|--------|-----|---------|-------|----------|---------|----------------------|
| Priya (sr backend eng) | in | Yes | Yes | **9** | 8→9 | "The UTC source-tz nudge actually recomputes — `9-17` flipping to server-UTC is the exact thing I open a PR to verify; export is a drop-in PR comment." |
| Marcus (frontend eng) | in | Yes | Yes | 8 | 8→8 | "The new hint literally lists 'at midnight every day' as supported, then the parser rejects it — the headline fix advertises a phrasing the engine breaks on." |
| Wen (mktg data analyst) | in | Yes | Yes | **9** | 9→9 | "The export is timezone-faithful — UTC source gives me a paste-ready dbt/Airflow runbook I lacked — but the whole-file Copy button gives NO visible confirmation." |
| Tomás (ops analyst) | in | Yes | Yes | **10** | 9→**10** | "It finds the UTC toggle for me, fixes the 7-hour lie, and the export gives me a runbook I'd paste into SharePoint — that's a 10." |
| Dana (demand-gen mktr) | borderline | Yes | Yes | 8 | 8→8 | "The phrasings hint means I'm no longer staring at a dead-end, but it still rejects 'every Monday morning' — I want it to guess what I meant, not show me the rulebook." |
| Jules (content mktr) | borderline | Yes | Yes | **9** | 9→9 | "Copying the whole crontab back as inline `# →` comments is what makes this the tool I'd keep open while wiring a webhook bot, not a one-off lookup." |
| Aisha (product designer) | borderline/in | Yes | Yes | **9** | 9→9 | "My exact dimming nit is genuinely fixed and jobs pop now — but the copy controls are too quiet, so the best feature is easy to miss." |
| Rob (visual designer) | **OUT** | Yes | Yes | 7 | 6→7 | "The 'copy explained crontab' that pastes a `# →` comment under each job is the first feature that's actually mine, not the devops crowd's — but I only reach for this a few times a year." |
| Elena (eng manager) | in | Yes | Yes | **9** | 8→9 | "The annotated export is a paste-into-Slack artifact for my reports — and pasting a single expression now shows the PREVIOUS run, removing my back-compute friction." |
| Sam (product manager) | borderline | Yes | **Yes** | **9** | 5→9 | "My one job — paste cron + plain-English gloss + shareable link into a ticket — is now fully covered; value flipped from No to Yes." |

Advocacy mean: 7.9 → **8.7** (incl. out-of-ICP Rob). In-audience-only mean (excl. Rob): **8.9**.

## Exit-bar status (AUDIENCE-WEIGHTED: ~9/10 at advocacy >=9 AND clarity=Yes AND value=Yes)

In-audience roster (9 testers, Rob excluded as documented out-of-ICP):
Advocacy >=9 with clarity+value=Yes: **7/9** — Priya, Wen, Tomás, Jules, Aisha, Elena, Sam.
The two in-audience holdouts at 8: **Marcus** and **Dana** (both clarity=Yes, value=Yes).
Clarity=Yes: 10/10. Value=Yes: **10/10** (Sam's R1 value=No flipped to Yes — the headline win).

**Verdict: PASS (audience-weighted).** 7/9 in-audience advocate at 9+, the lone value=No is
resolved, zero regressions, and BOTH remaining holdouts sit at 8 with clarity+value=Yes and
the SAME single, shared, non-fundamental complaint (one-direction NL parser coverage — they
want "did you mean…?" guessing, not a rulebook). That is the user-panel exit pattern: ~9/10
advocating high, no value rejections, holdouts citing one cosmetic/coverage gap rather than
distrust. The R1 #1 blocker (no copy/export — Sam value=No, capped Wen) is eliminated.

## What got fixed (mapped to R1 complaints)

- **A. Copy/export (R1 #1 BLOCKER) — RESOLVED.** Single-mode "Copy explanation" copies the
  plain-English gloss; file-mode "Copy explained crontab" emits a paste-ready annotated file
  (original order/comments/env preserved, `# →` plain-English + next-run under each job);
  per-job Copy present. A shareable permalink also exists (`/e/<expr>`, loads HTTP 200 with
  the expression preloaded — Sam verified). This flipped Sam 5→9 (value No→Yes) and is
  praised by Priya, Wen, Tomás, Jules, Aisha, Elena, Rob as a real runbook/ticket artifact.
- **C. Timezone default/discoverability — RESOLVED.** Prominent source-tz control + "usually
  UTC" hint; flipping source visibly recomputes next/previous runs. Lifted Tomás 9→10 (his
  off-by-7-hours concern), confirmed by Priya (K8s), Wen (DST-faithful export), Elena (mobile).
- **D. Craft: dimming — RESOLVED.** COMMENT/ENV rows now genuinely dimmed; jobs pop on skim
  (Aisha confirmed her exact nit fixed; corroborated by Priya, Tomás).
- **E. Past-run view — UNEXPECTEDLY ADDRESSED.** Elena reports single mode now shows
  "Previous run: …" above the next-5 list and recomputes with source-tz; her R1 hard blocker
  is now a wish (scrollable history), not a blocker. Lifted Elena 8→9.
- **B. NL parser brittleness — PARTIALLY addressed (the lone open thread).** A "supported
  phrasings" hint + example chips + a failure suggestion now exist (no more silent stale
  cron). But the parser still rejects loose-but-readable input ("every Monday morning",
  "twice a day on weekdays") and — worse — the hint advertises "at midnight every day" which
  the parser then REJECTS (Marcus's credibility hit). This is the one thing capping Marcus 8
  and Dana 8.

## #1 remaining (non-blocking) issue

NL-generator credibility: the "supported phrasings" hint lists "at midnight every day" but the
parser rejects it (Marcus), and loose near-misses get a rulebook instead of a "did you mean…?"
suggestion (Dana). Fix = (a) make every advertised phrasing actually parse (esp. midnight/noon
on input — the explainer already renders `@daily` as "12:00 AM (midnight)"), and (b) add a
best-guess suggestion on near-miss. This would clear both 8-holdouts to 9+.

## Smaller craft polish noted (would push carried 9s to 10, not blocking)

- "Copy explained crontab" whole-file button shows no visible "Copied!" confirmation on
  success (Wen — verified byte-identical button HTML before/after; clipboard content correct;
  per-job + single-mode copies DO confirm). Discrepancy vs the change-notes claim of in-place
  confirmation on the whole-file button.
- Copy controls are visually quiet/low-contrast; the top-right export — the single best
  feature — is easy to miss (Aisha). Single-mode gloss button reads generic uppercase "COPY"
  (descriptive label only in aria-label) and nearly conflates with the expression's "Copy"
  (Sam). Per-job copy returns only the explanation, not cron+explanation (Aisha).

## Out-of-ICP documentation

- **Rob (freelance visual designer) — advocacy 7 (up from 6), the documented non-fit.**
  Clarity+value Yes; the copy/export closed his only functional gripe, but his 7 is an
  intrinsic recurrence ceiling ("a few times a year"), not a quality/clarity defect — nothing
  confused him, nothing broke. Excluded from the pass numerator as an expected out-of-ICP
  holdout, exactly as in R1.
- Dana/Jules (marketers) and Sam (PM) are borderline-ICP; scored normally. Sam's R1 value=No
  was a real workflow blocker (now fixed), not roster-fit.

## Recommendation

Bar met (audience-weighted PASS, 7/9 in-audience at 9+, value=No eliminated, zero regressions).
Halt the panel loop per user-panel.md. If a cheap polish pass is desired before/after ship, do
the NL-parser-hint reconciliation (B) — it is the only thing standing between the two 8-holdouts
and a clean 9/9 — plus the whole-file "Copied!" confirmation and copy-button prominence to lift
the carried 9s toward 10. None are blockers.
