# Round 1 — Sam (Product manager, mobile-heavy)

I toggled to CRONTAB FILE, pasted a 6-line crontab (comments + one junk line). It rendered
one clean row per line — comment / job / dialect / plain-English / next 5 runs — and flagged
the junk line as "Not a valid cron expression: it has 4 fields." That part is genuinely good.

The problem is my whole reason for being here: I write a ticket and want to paste the
cron + the plain-English gloss + a shareable link. In CRONTAB FILE mode there is NO copy
button and NO permalink/share anywhere — I'd have to hand-retype every English line into
Notion/Asana. In SINGLE mode the "Copy" button copies the raw expression (`*/15 9-17 * * MON-FRI`),
NOT the English ("Every 15 minutes, between 09:00 AM..."), and "Copy link" works but only for
one expression. So even for a single job I can't one-click grab the English sentence I came for.

```json
{
  "name": "Sam",
  "clarity": "Yes",
  "value": "No",
  "advocacy": 5,
  "advocacy_reason": "Crontab mode is accurate and the toggle is obvious, but it fails my core job: I can't copy the plain-English gloss anywhere (Copy grabs the raw cron, not the sentence), and crontab mode has zero copy/share/permalink — so I'd retype every line into a ticket by hand. A reference tool, not a 'paste into the ticket' tool. Until the English text is copyable and the whole crontab is shareable by link, I won't bring this up to my team.",
  "found_crontab_mode": "Yes",
  "most_important_quote": "In CRONTAB FILE mode there is no Copy and no Copy link at all — copy-matches: 0, link/share-matches: 0.",
  "bugs_or_friction": [
    "CRONTAB FILE mode has NO copy button and NO permalink/share — cannot get results into a ticket without retyping",
    "Single-mode 'Copy' copies the raw cron expression, not the plain-English gloss I actually want to paste",
    "No way to copy the English description (the gloss) in EITHER mode",
    "No shareable link for a whole crontab (only single expressions get a permalink)",
    "Mobile: long results are a tall scroll with no per-row copy, painful between meetings"
  ]
}
```
