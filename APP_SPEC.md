# Cron Explainer

Purpose: For developers and ops folks who can't read cron at a glance — paste a cron
expression and instantly see what it means in plain English plus the next 5 times it will
run, in your local timezone.

Core flows:
1. Explain an expression: the user types or pastes a cron string into a single input on the
   home page. As they type (no submit button required), the page shows (a) a one-sentence
   plain-English explanation and (b) the next 5 run times rendered in the browser's local
   timezone, each as an absolute timestamp (e.g. "Thu, Jun 11 2026, 14:30") plus a relative
   hint (e.g. "in 12 minutes"). The local timezone name (e.g. "America/Los_Angeles") is
   labeled near the list.
2. Handle invalid input: any unparseable string (wrong field count, out-of-range values,
   garbage text) shows a clear inline error like "Not a valid cron expression: ..." with a
   short reason when available. The page never crashes, never shows a blank state, and the
   error clears as soon as the input becomes valid.
3. API access: `GET /api/explain?expr=<url-encoded cron>` returns JSON
   `{ "expression": string, "description": string, "next": [5 ISO 8601 UTC timestamps] }`
   with status 200, or `{ "error": string }` with status 400 for invalid input. The home
   page links to or documents this endpoint in one line.

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

Out of scope:
- Building cron expressions from English (reverse direction) or any visual cron builder.
- 6/7-field cron (seconds, years), Quartz syntax, `@reboot`, and non-standard macros.
- Timezone picker / showing runs in arbitrary zones (local + UTC-in-API only).
- Accounts, saved expressions, history, sharing links, rate limiting, or any persistence.
- Explaining crontab files with multiple lines or environment variables.

Production URL: TBD — filled in by deployer
