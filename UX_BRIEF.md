# UX Brief — cron-explainer (round 3 — multi-dialect)

Direction for the builder. Do not break any APP_SPEC core flow or success check. Keep the
5-second rule: a stranger reads the hero and instantly gets "decode/write cron in plain
English." Hero headline + prefilled example (`*/15 9-17 * * MON-FRI`) stay as-is.

## NEW THIS ROUND — multi-dialect (Quartz / AWS) + Translate — DISCOVERABILITY IS THE BAR

Lessons (added-feature-buried, optional-ui-gated-on-data-presence, same-verb-adjacent-controls,
copy-confirmation): a new feature that's functionally done but visually buried costs 1–2 panel
rounds. The dialect support and Translate MUST be first-class and visible on COLD LOAD — never
in a menu. A first-time visitor must grasp "this handles Quartz/AWS too, and can convert
between them" within the 5-second rule.

### H — Dialect badge + override (adjacent to the cron input, ALWAYS visible)
- Render a compact dialect control on the SAME row as / directly under the cron input, in the
  micro-label register: a small UPPERCASE label "DIALECT" + the auto-detected value shown as a
  segmented selector with three options — **Unix · Quartz · AWS** — the detected one active.
- ALWAYS visible, including the 5-field cold-start case (selector shows **Unix** active for the
  prefilled example) — it must NOT vanish for normal 5-field input (optional-ui-gated-on-data-
  presence). This is how the capability stays legible at first paint.
- It is BOTH an indicator and an override: auto-detect sets the active segment as the user
  types; clicking a segment forces that dialect and re-explains the same string under those
  rules. When a field-count auto-detect is unambiguous (5 → Unix, 7 → Quartz), keep the
  segment in sync but still allow manual force. Ambiguous 6-field defaults to Quartz active.
- A one-line micro-caption under it states the detected reason quietly, e.g.
  "6 fields with leading seconds — read as Quartz" — so the auto-detect isn't a black box.

### I — Translate control (near the result, label distinct from Copy/Generate)
- Place a **Translate to →** control in the result area (e.g. in the "In plain English" panel
  header or just below the cron input, NOT buried). It offers the two OTHER dialects as targets
  (e.g. when Unix is active: "Translate to → Quartz · AWS"). Clicking writes the converted
  expression into the cron input so explanation/next-5/permalink all follow.
- LABEL HYGIENE (same-verb-adjacent-controls): the existing controls read "Copy" / "Copy link"
  and the English panel reads "Generate(d)". The new verb is **Translate** — keep it visually
  and lexically distinct (its own button style/placement); do not let "Translate", "Generate",
  and "Copy" read as the same affordance cluster.
- When a source feature can't be represented in the target, show an inline note in the amber/
  warning register (reuse the English-error styling), e.g. "Sub-minute seconds can't be
  represented in Unix 5-field." Never silently drop precision.
- copy-confirmation: the translated expression is what users copy next — the existing inline
  "✓ Copied!" green-flash on the Copy button (persistent trigger, ~1.5s) MUST keep working on
  the translated value. Do not introduce a new copy pattern; reuse the proven one.

### Cold-load default state + mobile (375px)
- Cold load = prefilled `*/15 9-17 * * MON-FRI`, dialect selector showing **Unix** active,
  Translate offering Quartz/AWS. The capability is legible before any typing.
- The dialect selector and Translate control are COMPACT (micro-label + segmented chips) and
  sit BETWEEN the cron input and the existing helper caption — they must NOT push the cron
  input or the first result below the fold on a 375px viewport. On narrow widths the dialect
  segments and Translate targets may wrap to a second line, but stay above the result panels.

## A — API timezone correctness (highest priority)
`next` must be genuine ISO-8601 UTC instants. Compute next runs against a real zone, then
serialize as true UTC (the `Z` value must be the actual instant, not the cron wall-clock
digits). Honor `?tz=<IANA>` (default `UTC`); the array must be consistent with whatever the
UI shows for the same tz. Out-of-range/invalid tz → fall back to UTC, don't 400.

## B — Copy buttons with "Copied!" confirmation
Two copy affordances, both small ghost buttons with a clipboard icon + label:
- **Copy cron** — sits flush-right inside/beside the generated cron expression chip.
- **Copy link** — sits flush-right beside the permalink row (see F).
On click: button label/icon swaps to a green check + "Copied!" for ~1.5s, then reverts.
Confirmation is inline on the same button (no toast). Buttons only render when input is
valid.

## C — Timezone selector (drives UI + permalink + API)
Place a compact selector in the run-times panel header, next to the zone label.
- Minimum: a segmented **Local | UTC** toggle. Preferred (if clean): a searchable IANA tz
  dropdown defaulting to the browser zone, with Local and UTC pinned at top.
- Changing it re-renders the next-5 list AND rewrites the visible permalink + Copy-link
  target to include `?tz=<selected>`. The same `?tz=` value flows to `/api/explain`.
- Label the list "Next 5 runs — <zone name>" so the active zone is always explicit.

## D — Broaden NL parser + examples
Extend the deterministic grammar (no LLM) to also accept: time words `noon`/`midnight`;
`first of the month` / `last of the month`; weekday-first ordering ("9am every monday",
"every monday at 9am"); `every N minutes`/`every N hours`; am/pm and bare-hour variants.
Keep unparseable phrases on the friendly message (E). Under the English input show a
rotating/static **example chip row** users can click to fill the input:
`every weekday at 9am` · `noon every day` · `first of the month at 9am` · `every 30 minutes`
· `9am every monday`. Microcopy above input: "Describe a schedule in plain English."

## E — No false success on parse error
On any parse failure (cron OR English), the prior result must not read as success. Clear the
cron chip, explanation, and run-times list (or dim them to ~40% with the copy/permalink
controls disabled) so only the error is live. Cron error copy: "That doesn't look like a
valid cron expression — check the number of fields and value ranges." English error copy:
"Couldn't read that schedule. Try one of the examples below." Error clears the instant input
becomes valid; results re-appear at full opacity.

## F — Visible, copyable permalink + `?expr=` alias
Whenever input is valid, render a dedicated **permalink row** below the results: a read-only
field showing the full `<origin>/e/<encoded-expr>` URL + the Copy-link button (B). Always
visible when valid — never hidden behind a hover. Accept `?expr=` / `?cron=` as query
aliases that prefill the input (same effect as `/e/<expr>`), so param-guessers land correctly.

## G — Previous runs (only if cheap)
If trivial with the chosen library, add a single muted line above the next-5 list:
"Previous run: <absolute time> (<relative>)" in the active zone. Skip silently if it adds
parser complexity — not a blocker.

## Emotional tone
Fast, precise, developer-trustworthy. Mono font for cron/timestamps, clean sans for prose;
cool neutral grays with one accent (blue) for actions and green only for "Copied!"/valid.
Compact, tool-like spacing — dense but not cramped.

## Builder must
- H: Dialect segmented selector (Unix·Quartz·AWS) adjacent to the cron input, ALWAYS visible
  (Unix active on 5-field cold start), both indicator + override; quiet reason micro-caption.
- I: Translate-to control near the result, label distinct from Copy/Generate; inline amber
  note when a feature can't map to the target; reuse the existing green "✓ Copied!" flash.
- Regression: legacy 5-field behaves byte-identically; new controls don't push input/result
  below the fold at 375px.
- A: API `next` = real UTC ISO instants, honor `?tz=`, consistent with UI.
- B: Copy-cron + Copy-link buttons, inline green "Copied!" for ~1.5s.
- C: Local|UTC selector (or tz picker) driving UI list, permalink, and `?tz=`.
- D: Broaden NL grammar (noon/midnight, first/last of month, weekday-first, N-min/N-hour,
  am/pm) + clickable example chips.
- E: On parse error, clear/dim prior result + disable copy — no false success; friendly copy.
- F: Always-visible copyable permalink row when valid; accept `?expr=`/`?cron=` aliases.
- G: (If cheap) one "Previous run" line in the active zone.
