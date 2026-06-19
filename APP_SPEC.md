# Cron Explainer

Purpose: For developers and ops folks who can't read or write cron at a glance — paste a
cron expression and instantly see what it means in plain English plus the next 5 times it
will run — in your timezone or any IANA zone, with a separate "this schedule runs in [tz]"
source selector so a UTC server cron reads correctly in local time — or type a plain-English
schedule and get the cron expression generated for you.

Core flows:
1. Explain an expression in ANY supported dialect (including invalid input): the user types
   or pastes a cron string into a single input on the home page. The app supports standard
   Unix 5-field, Quartz/Spring (6-field with a LEADING seconds field; 7-field with a TRAILING
   year), and AWS EventBridge (6-field: minute hour day-of-month month day-of-week year, with
   `?`, `L`, `W`, `#` tokens). The app AUTO-DETECTS the dialect (primarily by field count,
   plus telltale tokens `?`/`L`/`W`/`#`) and shows the detected dialect in a visible badge
   adjacent to the input; a MANUAL OVERRIDE selector lets the user force the interpretation
   (e.g. flip an ambiguous 6-field expression between Quartz and AWS). Default dialect for a
   bare 5-field expression is always Unix; the ambiguous-6-field deterministic default is
   Quartz (override to AWS when desired). As the user types (no submit button required), the
   page shows (a) a one-sentence plain-English explanation and (b) the next 5 run times,
   each as an absolute timestamp (e.g. "Thu, Jun 11 2026, 14:30") plus a relative hint
   (e.g. "in 12 minutes"); for Quartz seconds expressions the next-5 computation HONORS the
   seconds field. The timezone the times are shown in is labeled near the list. Any
   string that is invalid in ALL dialects (wrong field count for every dialect, out-of-range
   values, garbage) shows a clear inline error like "Not a valid cron expression: ..." with a
   short reason. The page never crashes, never shows a blank state, and the error clears as
   soon as the input becomes valid.
   TIMEZONE (sub-capability of flow 1 — TWO independent, clearly-distinct selectors): cron has
   TWO timezone concepts and the UI must not conflate them. (i) SOURCE / execution timezone —
   "this schedule runs in [tz]": the timezone the cron expression is EVALUATED in, so
   `0 9 * * *` means 9:00 in the chosen source tz. Default = the viewer's browser-local
   timezone (PRESERVES today's computed instants exactly — no silent change to existing links),
   with a one-click UTC option and a searchable arbitrary-IANA picker, plus a short nudge that
   "servers usually run cron in UTC — switch the source to UTC if this runs on a server."
   (ii) DISPLAY timezone — the timezone the resulting next-run instants are SHOWN in (this is
   the existing Local ↔ UTC toggle, now extended to a searchable arbitrary-IANA picker; default
   = Local, unchanged). With source ≠ display the page reads e.g. "`0 9 * * *` runs in UTC →
   next: 2:00 AM your time." BOTH selectors are DST-CORRECT: next-run math honors daylight-
   saving transitions in the source tz (e.g. `0 2 * * *` near a spring-forward) AND the
   displayed wall-clock honors DST in the display tz. The labeled tz name next to the list is
   the DISPLAY tz; the source tz is labeled on/next to its own selector. Changing either
   selector re-renders next-5 + the relative hints immediately, with no submit. The page also
   shows a brief "Runs entirely in your browser — nothing is sent" reassurance.
   TRANSLATE (sub-capability of flow 1): a one-click control near the result converts the
   current expression to another dialect (e.g. Unix `0 9 * * 1-5` ↔ Quartz `0 0 9 ? * MON-FRI`),
   writing the result into the input (so explanation, next-5, and permalink follow). When a
   feature can't be represented in the target dialect, an inline note states why (e.g.
   sub-minute seconds or `L`/`W`/`#` cannot be expressed in Unix 5-field).
2. Generate from English: a second input where the user types a plain-English schedule
   (e.g. "every weekday at 9am", "every 10 minutes on weekends", "at 6:30pm on the 1st").
   As they type, the page shows the generated cron expression and feeds it into the SAME
   explanation + next-5-run-times view as flow 1 (the cron input updates to the generated
   expression, so the permalink and explanation reflect it). Phrases the generator doesn't
   understand show a clear inline message (e.g. "Couldn't understand that schedule") with
   2–3 example phrases that do work — no crash, no blank state, and the message clears
   when the phrase becomes parseable. This is the differentiator crontab.guru lacks.
3. API access: `GET /api/explain?expr=<url-encoded cron>[&tz=<IANA timezone>]` returns JSON
   `{ "expression": string, "description": string, "next": [5 ISO 8601 UTC timestamps] }`
   where `next` contains genuine UTC instants computed in the requested timezone (default
   UTC when `tz` is absent). The API AUTO-DETECTS the dialect by field count + telltale
   tokens (same logic as the UI), so existing 5-field callers are unaffected (default Unix);
   6/7-field Quartz and AWS expressions are now explained instead of 400-ing. An optional
   `&dialect=unix|quartz|aws` param MAY force the interpretation for ambiguous 6-field input;
   when absent, detection runs (ambiguous-6-field defaults to Quartz). If `tz` is present but
   not a valid IANA timezone, the API returns 400 `{ "error": "Unknown timezone: <value>" }`
   — it does NOT silently coerce to UTC. Status 200, or `{ "error": string }` with status 400
   for input invalid in all dialects or invalid tz. The home page documents this endpoint.
   PERMALINK (sub-capability of flow 1): whenever the current input is a valid expression, the
   page shows an always-visible copyable permalink of the form `<origin>/e/<url-encoded-expression>`
   with a Copy-link button that shows a "Copied!" confirmation for ~1.5s. The permalink carries
   the chosen timezones so a shared link reproduces the same view: a DISPLAY-tz param `?tz=<IANA>`
   (legacy `?tz=UTC` continues to mean display-in-UTC and is omitted when display is Local) and a
   SOURCE-tz param `?src=<IANA>` (omitted when source is the default Local). Opening a link with
   these params restores both selectors and renders identical next-5. The page also accepts
   `?expr=` and `?cron=` query-string aliases that prefill the input identically to the
   `/e/<expr>` form. Opening any of these renders the app pre-filled — no extra interaction
   needed. Invalid or garbage `/e/...` paths render the app with the raw string in the input and
   the normal inline error (no crash, no 500).
4. Explain a whole crontab file: a CRONTAB-FILE mode (reached by an explicit, always-visible
   mode toggle next to the cron input — "Single expression" | "Crontab file", with single
   the default so flow 1 never regresses) where the user pastes a MULTI-LINE crontab into a
   textarea. The app parses the file LINE BY LINE, preserving file order, and renders one row
   per line: (a) each JOB line is explained with the SAME engine as flow 1 — its raw expression,
   the plain-English description, and the next 5 run times — reusing explainCron per line, NOT a
   forked parser; (b) `KEY=VALUE` ENVIRONMENT lines are detected and shown in a de-emphasized,
   labeled "ENV" treatment (key + value, no cron explanation); (c) `# COMMENT` lines are shown
   de-emphasized with a "COMMENT" label; (d) BLANK lines are collapsed/shown as a thin spacer so
   the file reads top-to-bottom as written; (e) an INVALID job line shows the existing inline
   per-line error ("Not a valid cron expression: ...") WITHOUT breaking the parsing or rendering
   of any other line. A short summary line states the counts (e.g. "4 jobs · 1 environment
   variable · 2 comments · 1 invalid line"). The SOURCE-tz and DISPLAY-tz selectors apply to
   EVERY job in the file consistently (one set of selectors governs the whole file). A one-click
   "Load a sample crontab" button fills the textarea with a realistic known multi-job crontab
   (with at least one env var, one comment, one blank line, and one intentionally-invalid line)
   so the whole flow is visible in seconds. This multi-line auditing is the differentiator
   crontab.guru lacks (it handles single lines only). The crontab textarea is NOT shared by URL
   (no permalink for file mode); the single-expression permalink (flow 1 sub-capability) is
   unchanged.

Builder decisions (binding):
- Support standard Unix 5-field cron (minute hour day-of-month month day-of-week), including
  `*`, ranges (`1-5`), lists (`1,15`), steps (`*/5`, `1-30/2`), and month/day names
  (`JAN`, `MON`). Also support the special strings `@hourly`, `@daily`, `@midnight`,
  `@weekly`, `@monthly`, `@yearly`, `@annually`. `@reboot` stays rejected with an explanatory
  error.
- Multi-dialect support: ADD Quartz/Spring (6-field leading seconds; 7-field trailing year)
  and AWS EventBridge (6-field with year; `?`, `L`, `W`, `#`) IN ADDITION TO Unix 5-field.
  Auto-detect by field count + telltale tokens; ambiguous 6-field defaults to Quartz, with a
  visible manual override. Legacy 5-field expressions behave EXACTLY as before — byte-identical
  explanation text, next-5, permalink, and API output (default dialect = Unix). Quartz next-5
  must honor the seconds field. Accept `cron(...)` AWS wrappers if cheap (strip the wrapper).
- Translate: convert the current expression to a chosen dialect in one click; emit an inline
  note when a source feature can't be represented in the target (sub-minute seconds → Unix,
  `L`/`W`/`#` → Unix). Round-trip-faithful where the meaning is representable.
- Use established libraries (e.g. `cronstrue` for the English description, `cron-parser`
  for next-run computation) rather than hand-rolling a parser.
- UI parsing/explanation runs client-side for instant feedback; the API route does the same
  computation server-side. API timestamps are UTC ISO 8601; the UI converts to local time.
- Input is prefilled with a sensible example (e.g. `*/15 9-17 * * MON-FRI`) so the first
  paint already demonstrates the product.
- English-to-cron is a deterministic, rule-based parser running client-side (no LLM, no
  network call, no paid service). It handles: "every minute", "every N minutes/hours"
  (with optional day qualifiers), "every day/weekday at H(:MM)?(am|pm)", named weekdays
  ("every monday at 9am", "9am every monday", "on mon and fri at 17:00"), "every hour",
  "at H(:MM)?(am|pm) on the Nth" (day of month), "noon"/"midnight" time words,
  "first/last of the month at <time>", "every N minutes/hours", "quarterly [at <time>]",
  weekday-first ordering ("9am every monday"), and am/pm variants. Anything outside the
  grammar gives the friendly can't-understand message — never a wrong silent guess.
  Case-insensitive, tolerant of extra whitespace.
- The English input does NOT round-trip from the cron input (one direction only: English →
  cron). Editing the cron input directly leaves the English input as-is.
- TIMEZONE — source vs display are TWO independent selectors and must never be conflated.
  SOURCE = the execution tz passed to cron-parser (`explainCron`'s `tz` arg / `prevCronRun`);
  DISPLAY = the tz `toLocaleString` formats the resulting instants in. The cron is computed in
  UTC-instant space; source controls WHEN it fires, display controls how that instant reads.
  BACK-COMPAT (binding): DEFAULT source = the browser-local tz (today's `evalTz = localTz`),
  so the prefilled example and every legacy permalink render byte-identical next-5 to today —
  do NOT flip the default source to UTC (that would silently change existing results). UTC is
  one click away on the source selector, not the default. Default display = Local (unchanged).
  Both selectors use a free arbitrary-IANA list (`Intl.supportedValuesOf('timeZone')`) with
  search — no paid/network tz service. DST correctness comes for free from cron-parser (source)
  + `Intl`/`toLocaleString` with `timeZone` (display); add tests proving a source-tz DST case.
- CRONTAB-FILE mode (binding): the line classifier runs client-side and is deterministic —
  blank/whitespace-only → BLANK; first non-whitespace char `#` → COMMENT; matches
  `^\s*[A-Za-z_][A-Za-z0-9_]*\s*=` → ENV (split on the first `=`); else → JOB line, fed VERBATIM
  to the SAME `explainCron` used by flow 1 (per line; no forked parser). A JOB line that throws
  CronError renders the existing inline error string for THAT line only and never aborts the
  loop. Each JOB row also reuses the per-line dialect auto-detect (and may show the detected
  dialect badge inline, compact); there is no per-line override in MVP — file mode is read-only
  auditing. The SOURCE/DISPLAY tz selectors are the SAME state object used by single-expression
  mode (one set governs all jobs). The mode toggle preserves the single-expression input when
  switching back (no data loss). e2e/SELECTOR NOTE: the cron `<input id="cron-input">` and the
  surrounding control structure are shared landing structure — if adding the mode toggle changes
  the input element, its wrapper, or the dialect/tz rows, UPDATE the existing e2e selectors that
  target them IN THE SAME CHANGE (intended-change-to-shared-landing-structure leaves stale e2e).
- API back-compat: `/api/explain?tz=` KEEPS its existing meaning (the execution/source tz that
  next-runs are computed in) — do NOT repurpose it. The UI permalink's `?tz=` is the DISPLAY tz
  and `?src=` is the source tz; this UI/API split is pre-existing and stays. Document it on-page.

Success checks:
- Loading the home page shows a prefilled example expression with a non-empty English
  description and exactly 5 upcoming run times already rendered.
- Entering `0 9 * * MON-FRI` shows a description containing "09:00" (or "9:00 AM") and
  "Monday through Friday", and 5 run times that all fall on weekdays at 9:00 local time.
- Entering `@daily` shows a midnight description and 5 consecutive daily run times.
- (REGRESSION) Every 5-field success check below still holds byte-identically: a bare 5-field
  expression is detected as Unix, the dialect badge reads "Unix", and explanation/next-5/
  permalink/API match today's output exactly.
- Entering `61 * * * *` (or `not a cron`) shows an inline error mentioning the input is
  invalid; entering a valid expression afterward replaces the error with results. A string
  invalid in ALL dialects (e.g. `a b c d e f g h`) shows the inline error and never crashes.
- TIMEZONE — back-compat default: on first load (no tz params), the prefilled example's next-5
  and the labeled display-tz match today's output byte-for-byte (source defaults to browser
  local, display defaults to Local). A legacy `/e/<expr>?tz=UTC` link still shows display-in-UTC.
- TIMEZONE — source selector: with `0 9 * * *` loaded, setting SOURCE = UTC (display = Local in
  a non-UTC zone, e.g. America/New_York) changes the next-5 wall-clock times (9:00 UTC shown as
  04:00/05:00 ET depending on DST) and the source label reads "UTC"; the DISPLAY-tz label still
  reads the local zone. Setting source back to Local restores today's 09:00-local times.
- TIMEZONE — display selector: with source fixed, switching DISPLAY between Local, UTC, and an
  arbitrary IANA zone (e.g. Asia/Tokyo) re-renders the SAME instants with the correct wall-clock
  per zone and updates the labeled display-tz; the underlying ISO instants are unchanged.
- TIMEZONE — DST correctness: a source-tz DST case (e.g. `0 2 * * *` with source = America/
  New_York across the March spring-forward) computes the correct next instants (the skipped 2am
  is handled per cron-parser), and a display-tz across its own DST shows the right wall-clock.
- TIMEZONE — permalink round-trip: choosing a non-default source and display, copying the
  permalink, and opening it in a fresh load restores both selectors and renders identical next-5.
- DIALECT — Quartz seconds: entering `0 0 9 ? * MON-FRI` shows the dialect badge "Quartz", a
  description meaning 9:00 AM Monday–Friday, and 5 weekday-9:00 run times. Entering
  `*/30 * * * * *` (Quartz, 6-field) yields next-5 run times spaced exactly 30 seconds apart
  (seconds field honored).
- DIALECT — Quartz 7-field with year: entering `0 0 12 ? * MON 2027` (or `0 0 12 1 1 ? 2030`)
  is detected as Quartz and explained without error.
- DIALECT — AWS EventBridge: entering `0 9 ? * MON-FRI *` (or `cron(0 10 * * ? *)`) is detected
  as AWS, the `?` is accepted in day-of-month/day-of-week, and the description is correct.
- DIALECT — auto-detect + override: an ambiguous 6-field expression auto-detects to Quartz by
  default (badge "Quartz"); using the manual override to select AWS re-explains the SAME string
  under AWS rules and the explanation/next-5 change accordingly.
- TRANSLATE: with `0 9 * * 1-5` (Unix) loaded, clicking Translate → Quartz produces a valid
  Quartz expression equivalent to `0 0 9 ? * MON-FRI` that round-trips to the same meaning
  (9:00 AM weekdays). With a Quartz seconds expression (e.g. `*/30 * * * * *`) loaded,
  Translate → Unix shows the inline "can't represent sub-minute seconds in Unix" note.
- API DIALECT: `curl "<prod>/api/explain?expr=0%200%209%20%3F%20*%20MON-FRI"` (Quartz 6-field)
  returns HTTP 200 JSON with a weekday-9:00 description and 5 `next` timestamps — NOT a 400.
  The existing 5-field API calls return identical output to today (default Unix).
- `curl "<prod>/api/explain?expr=*/10%20*%20*%20*%20*"` returns HTTP 200 JSON with a
  `description` containing "every 10 minutes" (case-insensitive) and a `next` array of
  exactly 5 ISO 8601 timestamps spaced 10 minutes apart.
- `curl "<prod>/api/explain?expr=banana"` returns HTTP 400 with a JSON `error` field.
- Typing `every weekday at 9am` into the English input produces cron `0 9 * * 1-5` (or an
  equivalent like `0 9 * * MON-FRI`), and the explanation + next-run view update to show
  weekday 9:00 runs without any further interaction.
- Typing `every 10 minutes on weekends` into the English input produces `*/10 * * * 0,6`
  (or equivalent `SAT,SUN` form) and the explanation mentions every 10 minutes on
  Saturday/Sunday.
- Typing an unsupported phrase (e.g. `whenever mercury is in retrograde`) into the English
  input shows the can't-understand message with example phrases; the page does not crash
  and previously shown results are not replaced by garbage.
- After typing `0 9 * * MON-FRI`, the page shows a permalink ending in
  `/e/0%209%20*%20*%20MON-FRI` (or an equivalent encoding of the same expression) and a
  copy control that puts that absolute URL on the clipboard.
- `curl "<prod>/e/%2A%2F10%20%2A%20%2A%20%2A%20%2A"` returns HTTP 200 and the served HTML
  contains the description text for `*/10 * * * *` (i.e. "every 10 minutes" pre-rendered,
  case-insensitive).
- Visiting `<prod>/e/banana` in a browser shows "banana" in the input plus the inline
  invalid-expression error; the response status is not a 5xx.
- CRONTAB-FILE — mode toggle visible on cold load: the home page shows an explicit
  "Single expression" | "Crontab file" toggle, with "Single expression" active and the existing
  single-input flow rendered byte-identically (all flow-1 checks above still hold). Switching to
  "Crontab file" reveals a textarea + a "Load a sample crontab" button; switching back restores
  the single-expression input unchanged.
- CRONTAB-FILE — sample is seedable and time-invariant: clicking "Load a sample crontab" fills
  the textarea with EXACTLY this content (the verifier asserts these literal strings, which never
  change with wall-clock time):
  ```
  # Backup database every night
  MAILTO=ops@example.com
  0 2 * * * /usr/local/bin/backup.sh
  */15 9-17 * * MON-FRI /usr/local/bin/poll.sh

  @daily /usr/local/bin/rotate-logs.sh
  0 9 1 * * /usr/local/bin/send-invoices.sh
  61 * * * * /usr/local/bin/broken.sh
  ```
  After loading, the rendered output contains, in file order: a COMMENT row showing
  "Backup database every night"; an ENV row labeled with key "MAILTO" and value
  "ops@example.com"; a JOB row for `0 2 * * *` whose description contains "2:00 AM" (or "02:00");
  a JOB row for `*/15 9-17 * * MON-FRI` whose description contains "Monday through Friday"; a JOB
  row for `@daily` with a midnight/daily description; a JOB row for `0 9 1 * *` whose description
  mentions day 1 of the month; and an INVALID row for `61 * * * *` showing the inline
  "Not a valid cron expression" error (minute 61 out of range) WITHOUT removing or breaking any
  other row. Each valid JOB row shows exactly 5 next-run times. (All asserted strings are
  descriptions/labels, NOT wall-clock-relative next-run values.)
- CRONTAB-FILE — summary counts: with the sample loaded, a summary line reports
  "4 jobs · 1 environment variable · 1 comment · 1 invalid line" (exact counts; the 4 valid
  jobs = the two `*` cron lines + `@daily` + `0 9 1 * *`, the invalid line counted separately).
- CRONTAB-FILE — one bad line doesn't break the file: replacing only the `0 2 * * *` line with
  garbage (e.g. `not a cron line here`) leaves every OTHER row rendered correctly and shows the
  inline error on only that one row; the page never crashes or blanks.
- CRONTAB-FILE — shared timezone selectors: with the sample loaded, switching SOURCE to UTC (or
  DISPLAY to UTC) re-renders the next-run times of ALL job rows consistently with the single
  set of selectors; no per-row timezone control exists.
- CRONTAB-FILE — engine reuse parity: the description text and next-5 for `*/15 9-17 * * MON-FRI`
  shown as a row in crontab-file mode is identical to the description + next-5 the same
  expression produces in single-expression mode under the same source/display tz.

Out of scope:
- A visual/point-and-click cron builder.
- An API endpoint for English-to-cron (`/api/generate` or similar) — UI-only for now.
- LLM-backed or fuzzy natural-language parsing; only the documented deterministic grammar.
- Round-tripping cron back to the English input (cron → English text is the explanation,
  not the generator input).
- `@reboot` and non-standard macros beyond the listed `@` strings (still rejected with a
  clear error). English-generate emits Unix only — it does not target Quartz/AWS dialects.
- Accounts, saved expressions, history, rate limiting, or any persistence. (Sharing is
  permalinks only — no short links, no stored state.)
- Per-line dialect/timezone overrides in crontab-file mode (one global dialect-autodetect +
  one global source/display tz governs the whole file; file mode is read-only auditing).
- Editing/exporting/sharing a crontab file by URL, or validating crontab-specific syntax beyond
  the cron expression itself (e.g. `MAILTO`/`PATH` semantics, `@reboot` scheduling, run-as-user
  fields). ENV and comment lines are surfaced/labeled, not semantically validated.

Production URL: https://cron-explainer-xi.vercel.app
