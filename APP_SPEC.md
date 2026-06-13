# Cron Explainer

Purpose: For developers and ops folks who can't read or write cron at a glance — paste a
cron expression and instantly see what it means in plain English plus the next 5 times it
will run in your local timezone, or type a plain-English schedule and get the cron
expression generated for you.

Core flows:
1. Explain an expression (including invalid input): the user types or pastes a cron string
   into a single input on the home page. As they type (no submit button required), the page
   shows (a) a one-sentence plain-English explanation and (b) the next 5 run times rendered
   in the browser's local timezone, each as an absolute timestamp (e.g. "Thu, Jun 11 2026,
   14:30") plus a relative hint (e.g. "in 12 minutes"). The local timezone name (e.g.
   "America/Los_Angeles") is labeled near the list. Any unparseable string (wrong field
   count, out-of-range values, garbage text) shows a clear inline error like "Not a valid
   cron expression: ..." with a short reason when available. The page never crashes, never
   shows a blank state, and the error clears as soon as the input becomes valid.
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
   UTC). Invalid/unknown `tz` falls back to UTC silently. Status 200, or `{ "error": string }`
   with status 400 for invalid input. The home page documents this endpoint.
4. Shareable permalinks: whenever the current input is a valid expression, the page shows an
   always-visible copyable permalink of the form `<origin>/e/<url-encoded-expression>` with
   a Copy-link button that shows a green "Copied!" confirmation for ~1.5s. When UTC mode is
   active the permalink includes `?tz=UTC`. The page also accepts `?expr=` and `?cron=`
   query-string aliases that prefill the input identically to the `/e/<expr>` form.
   Opening any of these renders the app pre-filled — no extra interaction needed. Invalid
   or garbage `/e/...` paths render the app with the raw string in the input and the normal
   inline error (no crash, no 500).

Builder decisions (binding):
- Support standard 5-field cron (minute hour day-of-month month day-of-week), including
  `*`, ranges (`1-5`), lists (`1,15`), steps (`*/5`, `1-30/2`), and month/day names
  (`JAN`, `MON`). Also support the special strings `@hourly`, `@daily`, `@midnight`,
  `@weekly`, `@monthly`, `@yearly`, `@annually`. `@reboot` and 6-field (seconds) syntax are
  rejected with an explanatory error, not silently misparsed.
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

Success checks:
- Loading the home page shows a prefilled example expression with a non-empty English
  description and exactly 5 upcoming run times already rendered.
- Entering `0 9 * * MON-FRI` shows a description containing "09:00" (or "9:00 AM") and
  "Monday through Friday", and 5 run times that all fall on weekdays at 9:00 local time.
- Entering `@daily` shows a midnight description and 5 consecutive daily run times.
- Entering `61 * * * *` (or `not a cron`) shows an inline error mentioning the input is
  invalid; entering a valid expression afterward replaces the error with results.
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

Out of scope:
- A visual/point-and-click cron builder.
- An API endpoint for English-to-cron (`/api/generate` or similar) — UI-only for now.
- LLM-backed or fuzzy natural-language parsing; only the documented deterministic grammar.
- Round-tripping cron back to the English input (cron → English text is the explanation,
  not the generator input).
- 6/7-field cron (seconds, years), Quartz syntax, `@reboot`, and non-standard macros.
- Arbitrary IANA timezone picker beyond the Local ↔ UTC toggle (Local + UTC covered).
- Accounts, saved expressions, history, rate limiting, or any persistence. (Sharing is
  permalinks only — no short links, no stored state.)
- Explaining crontab files with multiple lines or environment variables.

Production URL: https://cron-explainer-xi.vercel.app
