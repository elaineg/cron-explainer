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

## TIMEZONE-AWARE NEXT-RUN (2026-06-18 add-feature)

Cron has TWO timezone concepts — the zone the schedule RUNS in vs. the zone the results are
SHOWN in. Conflating them is the #1 legibility risk here. The whole job is making "which
selector does what" obvious to a cold engineer in 5 seconds. Visual language unchanged — two
controls + one relationship line, reusing existing idioms (segmented chips, micro-labels).

### Two selectors, never conflated — exact micro-labels (do NOT rename)
- **SOURCE / execution tz** (NEW): micro-label **"This schedule runs in"** + the tz value.
  This is about INTERPRETATION — it changes WHEN the cron fires (`0 9 * * *` = 9:00 in this
  zone). Default = browser-local (binding back-compat: today's instants stay byte-identical;
  never default to UTC). Controls: a **Local · UTC** segmented chip pair (reuse the existing
  Local|UTC toggle styling) + an "Other…" affordance opening the searchable IANA combobox.
  Directly under it, one quiet micro-caption (zinc-400, no amber alarm):
  *"Servers usually run cron in UTC — switch the source to UTC if this runs on a server."*
- **DISPLAY tz** (EXTENDS today's toggle): micro-label **"Show times in"** + the tz value.
  This replaces the current `tzLabel`-only header control in the Next-5 panel. Keep the
  existing Local|UTC segmented toggle EXACTLY where it sits (panel header, flush-right), and
  add the same "Other…" → searchable IANA combobox. Default = Local (unchanged).

### Placement (interpretation lives near input; display lives near results)
- SOURCE selector sits **just above / on the same block as the cron input** — co-located with
  the thing being interpreted, NOT in the results panel. Pair it with the dialect badge region
  (both are "how we read this string" controls), but keep its label distinct so it doesn't
  read as a dialect option.
- DISPLAY selector stays in the **Next-5 panel header** (current position), extended only.
- This spatial split — "runs in" up by the input, "show in" down by the times — is itself the
  primary teaching device. Don't co-locate them in one cluster.

### The relationship line (reads like a sentence)
- Render a single muted line in the Next-5 panel header area, just under "Next 5 runs":
  **"Runs in <SOURCE> · shown in <DISPLAY>"** (e.g. *"Runs in UTC · shown in America/New_York"*).
  Use the existing mono/zinc microcopy register, the `·` middot as separator.
- ANTI-CONFUSION (binding): when **source == display** (the default, all-Local case), do NOT
  show the cross-tz line — it would read like a broken "runs in X · shown in X" tautology.
  Default/collapsed state: show only the normal "Next 5 runs — <zone>" label and the source
  caption. The "Runs in X · shown in Y" line APPEARS only when source ≠ display, where it earns
  its keep by explaining the wall-clock shift. No nag, no badge, when they match.

### Searchable IANA picker (both selectors)
- The arbitrary-zone picker is a **typeahead combobox** over `Intl.supportedValuesOf('timeZone')`
  — type "tokyo", "new", "berlin" to filter — NEVER a raw ~400-item `<select>`. Local + UTC
  pinned at the top. Each picker has its own clear associated label (the micro-label above it).
- A11y: combobox is fully keyboard-operable (arrow/enter/escape, focus-visible ring, listbox
  role + `aria-label` tying it to its micro-label). The Local·UTC chips remain buttons.

### Privacy reassurance (calm, not a trust-bomb)
- One small muted line (zinc-400, same register as the source caption), placed once near the
  selectors or footer: **"Runs entirely in your browser — nothing is sent."** No lock icon
  banner, no colored box — a quiet aside, not a security badge.

### Mobile (375px) — discoverable on first paint (added-feature-buried lesson)
- Both selectors + the relationship line MUST render above the fold area they belong to at
  375px, no horizontal scroll, no overlap, visible on first paint.
- SOURCE block stacks VERTICALLY: micro-label on its own line, then the Local·UTC chips +
  "Other…" wrapping to the next line, then the caption. It must not push the cron input or
  first result below the fold (same constraint as the dialect controls).
- DISPLAY: in the Next-5 header, if the label + toggle + "Other…" don't fit one row at 375px,
  the toggle wraps to a second line UNDER the "Next 5 runs — <zone>" label (label-over-control
  stack), never side-scrolls.
- The combobox dropdown opens as a full-width list under its trigger at 375px (not a clipped
  popover), keyboard- and tap-operable.
