```json
{"tester": 8, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Permalink URL doesn't live-update in the address bar as I type — I have to click 'Copy link' (small thing)", "Reverse English-to-cron generator is nice but not my job; adds a little vertical scroll between my input and the run times"], "priorConcernsAddressed": "all"}
```

# Round 2 — Tester 8 (Rob, freelance brand designer)

**Task:** decode `0 */4 * * *`, confirm next backup run in my time.

## Prior concerns — rechecked
- "Increment, not a switch-my-habit reason" → **addressed.** The permalink does it: `/e/0%20*%2F4...` loads the expression AND the result back. I can now bookmark the *exact* line from my backup script and skip retyping forever. crontab.guru can't hand me that.
- "No persistent recents/history" → **addressed differently and better.** Instead of a recents list, the copyable permalink IS my saved state. For someone who comes back twice a year, a bookmarked URL beats a history I'd have to remember to scroll.

## CLARITY — Yes
- Same instant read. Subhead now also mentions English→cron, still clear in 3s.

## VALUE — Yes
- `0 */4 * * *` → "On the hour, every 4 hours." Correct.
- **Previous run line is the sleeper feature:** "Previous run: Fri, Jun 12, 2026, 04:00 PM (4 hours ago)." That's literally the question I open this tool to answer — "did the last backup fire and when's the next?" crontab.guru makes me infer the past run; this states it.
- Local/UTC toggle works — wall-clock times shift correctly (08:00 PM PDT ↔ 03:00 AM UTC). My servers log in UTC, my eyes think in Pacific; flipping one toggle instead of doing the math is the exact friction removed.
- One-click Copy on the expression + Copy link both present. Permalink verified: it restores the full result on load.

## ADVOCACY — 9
Up from 8. The combination of previous-run line + local-time next runs + a bookmarkable permalink is now a concrete reason to drop crontab.guru for *my* recurring task — I'll bookmark the permalink of my actual backup line. I'd send this unprompted to anyone who's ever cursed at a crontab.

**Biggest remaining holdback (off a 10):** the permalink only updates when I click "Copy link" — the address bar stays at `/` while I type. If editing the expression rewrote the URL live (so my browser bookmark auto-captures it), I'd never think about it again. Tiny, but it's the last thing between 9 and 10.
