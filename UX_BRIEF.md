# UX Brief — cron-explainer (round 2)

Direction for the builder. Do not break any APP_SPEC core flow or success check. Keep the
5-second rule: a stranger reads the hero and instantly gets "decode/write cron in plain
English." Hero headline + prefilled example (`*/15 9-17 * * MON-FRI`) stay as-is.

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
- A: API `next` = real UTC ISO instants, honor `?tz=`, consistent with UI.
- B: Copy-cron + Copy-link buttons, inline green "Copied!" for ~1.5s.
- C: Local|UTC selector (or tz picker) driving UI list, permalink, and `?tz=`.
- D: Broaden NL grammar (noon/midnight, first/last of month, weekday-first, N-min/N-hour,
  am/pm) + clickable example chips.
- E: On parse error, clear/dim prior result + disable copy — no false success; friendly copy.
- F: Always-visible copyable permalink row when valid; accept `?expr=`/`?cron=` aliases.
- G: (If cheap) one "Previous run" line in the active zone.
