```
clarity: Yes
value: Marginal
advocacy: 6
```

# Round 1 — Tester 5 (Dana, demand-gen marketer)

**CLARITY — Yes.** The subhead nailed it: "describe a schedule in English and get the cron
expression generated for you." That's literally my problem (HubSpot wants a cron string, I
don't speak cron). The "Or describe a schedule in plain English" field is exactly where my
eyes went. One scroll, understood, didn't bounce.

**VALUE — Marginal.** It DID give me a usable string and — the part I liked — it shows
"NEXT 5 RUNS" with real dates (Mon Jun 15, 08:00 AM) so I can trust the output without
knowing cron. That's the confidence I needed. But the parser is brittle in a way that
burns a non-technical user:
- "every Monday at 8am" → `0 8 * * 1` ✅ perfect
- "first of every month at 9" → ❌ "Couldn't understand that schedule"
- "first of the month at 9am" → ❌ failed
- "9am every monday" → ❌ failed (but "every Monday at 8" works — word order matters?!)
- It only worked when I copied the EXACT hint phrasing "at 9am on the 1st" → `0 9 1 * *`

So half my natural phrasings failed, and the error message just repeats canned examples
instead of getting me closer. If I'm in a rush between meetings, a 50% miss rate means I
might give up and go Google a cron site instead.

**Copy friction:** there's no "copy" button on the generated `0 8 * * 1` string. The only
button is "Copy link" which copies a share URL, not the cron value. I have to hand-select
the tiny monospace text. Small thing, but I copy-paste this into HubSpot and screenshot
nothing — give me a copy-cron button.

**Biggest holdback:** the English parser is fussy. It rewards people who already know how
to phrase schedules and punishes the exact non-cron users it's for. Make "first of the
month" / "9am every monday" work and add a copy-the-cron button and this jumps to an 8.

```json
{"tester": 5, "round": 1, "clarity": "Yes", "value": "Marginal", "advocacy": 6, "topComplaints": ["English parser fails on natural phrasings like 'first of the month at 9am' and '9am every monday' — only the hint's exact wording works", "No button to copy the generated cron string itself (only 'Copy link' for a share URL)"], "priorConcernsAddressed": "n/a"}
```
