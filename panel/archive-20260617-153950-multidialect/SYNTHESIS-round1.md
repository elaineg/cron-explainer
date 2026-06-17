# Panel synthesis — cron-explainer round 1

URL tested: https://cron-explainer-xi.vercel.app
Exit bar: ≥9/10 with advocacy ≥9 AND clarity=Yes AND value=Yes. **Result: 3/10 at bar. Loop continues to round 2.**
(Profiles generated fresh from the post-2026-06-12 roster — first panel for this app.)

## Score table (round 1)

| # | Persona | Role | Clarity | Value | Advocacy | At bar? |
|---|---------|------|---------|-------|----------|---------|
| 1 | Priya | Backend eng | Yes | Yes | 8 | no |
| 2 | Marcus | Frontend eng | Yes | Yes | 8 | no |
| 3 | Wen | Data analyst | Yes | **Marginal** | **5** | no |
| 4 | Tomás | Ops analyst | Yes | Yes | **9** | YES |
| 5 | Dana | Demand-gen mktr | Yes | **Marginal** | **6** | no |
| 6 | Jules | Content mktr | Yes | Yes | 8 | no |
| 7 | Aisha | Product designer | Yes | Yes | **9** | YES |
| 8 | Rob | Brand designer | Yes | Yes | 8 | no |
| 9 | Elena | Eng manager | Yes | Yes | 8 | no |
| 10 | Sam | PM | Yes | Yes | **9** | YES |

Clarity is universally Yes — the app's purpose reads instantly. The gap is value/advocacy: solid core, but missing the polish and trust details that turn "nice" into "I'd switch from crontab.guru."

## Complaints grouped by cause

### A. Trust-breaking bug — API next-run times are wrong (T3 Wen, value Marginal / adv 5 — lowest score)
`GET /api/explain` returns `next` timestamps stamped with `Z` (UTC) but the values are the raw cron wall-clock numbers, NOT real UTC instants — they contradict the UI's local render and ignore any `?tz=`. For a data analyst who pipes JSON into dbt/Airflow reasoning, untrustworthy timestamps are a dealbreaker. **This is the single highest-leverage fix** (only sub-Marginal tester, and it's a correctness bug). Fix: API `next` must be genuine ISO-8601 UTC instants computed for a real timezone (accept `?tz=`, default UTC), consistent with the UI.

### B. No copy buttons (T1 Priya, T5 Dana, T10 Sam, echoed T6) — recurs across 4 personas
No button to copy the generated cron string (T5 Dana — non-technical, must hand-select tiny text) and the permalink "copy" gives no confirmation (T10 Sam: silent). Priya wanted to copy an expression/permalink into a PR comment and couldn't find one. Fix: explicit copy buttons with visible "Copied!" confirmation for (a) the cron expression and (b) the permalink.

### C. Timezone is local-only; no UTC/server-time option (T4 Tomás, T3 Wen, T10 Sam) — recurs across 3
Next-run times render only in the browser's zone. But ops/data users run servers in UTC (Tomás inherited a UTC server; Wen verifies UTC firing). They can't trust "next run" without seeing it in the server's zone. Fix: a timezone selector — at minimum Local ↔ UTC toggle, ideally a searchable tz picker — that drives both the UI list and the `?tz=` permalink/API.

### D. NL generator too narrow / fussy parsing (T2 Marcus, T5 Dana, T6 Jules) — recurs across 3
Natural phrasings fail unless they match the example wording exactly: "first of the month at 9am", "9am every monday", "noon", "quarterly", "every 30 minutes" all rejected (T2, T5). This is the named differentiator vs crontab.guru, so weak coverage caps the whole value prop. Fix: broaden the parser (time words like noon/midnight, "first/last of month", weekday-first ordering, N-minute/N-hour intervals, am/pm variants) and expand the example phrases shown.

### E. Stale output on parse failure reads as false success (T2 Marcus, T6 Jules) — recurs across 2
When a phrase/expression fails to parse, the previously-generated cron + schedule stays on screen next to the red error, looking like a wrong "success" until you look twice. Fix: on error, clear or visibly dim/disable the prior result so the error is unambiguous.

### F. Permalink discoverability (T1 Priya) — single persona but cheap
Priya tried `?expr=` and it was ignored; she didn't find the `/e/<expr>` permalink (which T10 confirms works). The permalink exists but isn't discoverable to someone guessing query params. Fix: make the copyable permalink visibly present whenever input is valid (ties to B's copy button); optionally also accept `?expr=`/`?cron=` as an alias.

### G. Past run times for incident triage (T9 Elena) — single persona, nice-to-have
Elena (adv 8) wants "did it fire yesterday?" — i.e. the previous N run times, not just next 5. Single-persona ask; address only if cheap (e.g. a small "previous runs" line). Not a round-2 blocker on its own, but she's at 8 and this is her only holdback.

### H. Not actionable / accepted
- T8 Rob (adv 8): "clean increment, not a reason to drop my crontab.guru bookmark." No single fix; the cumulative B/C/D improvements are what earn the switch. Re-test after round 2.
- T7 Aisha (9), T4 Tomás (9), T10 Sam (9): already at bar; T4 still wants the UTC toggle (C), T10 the copy confirmation (B) — both covered.

## Round 2 fix list (each maps to named testers)
1. **Fix API timezone correctness** — `next` = real UTC ISO instants, honor `?tz=`, consistent with UI (A — T3). *Highest priority.*
2. **Copy buttons with confirmation** — cron expression + permalink, "Copied!" feedback (B — T1, T5, T10, T6).
3. **Timezone selector** — Local ↔ UTC at minimum (ideally tz picker), drives UI + permalink + API `?tz=` (C — T4, T3, T10).
4. **Broaden NL parser + examples** — noon/midnight, first/last of month, weekday-first, N-min/N-hour intervals, am/pm; richer example list (D — T2, T5, T6).
5. **Clear stale result on parse error** — no false-success state (E — T2, T6).
6. **Visible permalink + `?expr=` alias** — discoverable, copyable when valid (F — T1).
7. *(If cheap)* previous-run-times line for incident triage (G — T9).
