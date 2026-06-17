clarity: Yes
value: Yes
advocacy: 9
priorConcernsAddressed: all

# Round 2 — Tester 1 (Priya, senior backend SWE, desktop/keyboard-first)

**Task (unchanged):** sanity-check teammate's PR CronJob `*/15 9-17 * * 1-5` in my TZ, then drop a link in the PR comment.

## Prior concerns — re-checked
- **`?expr=` deep-link ignored → FIXED.** Loading `/?expr=*/15+9-17+*+*+1-5` now pre-fills the box and renders "Every 15 minutes, between 09:00 AM and 05:59 PM, Monday through Friday" on cold open. No typing.
- **No copy button → FIXED.** "Copy" next to the expression writes `*/15 9-17 * * 1-5` to clipboard (verified). No more hand-selecting.
- **No shareable permalink → FIXED.** New "Copy link" button copies `…/e/*%2F15%209-17%20*%20*%201-5`; loaded fresh it round-trips — pre-fills input AND shows the English. This IS the PR-review workflow I wanted. priorConcernsAddressed: all.

## New since round 1 (nice)
- **Local/UTC toggle** on Next 5 Runs — exactly right; my teammate in another TZ can flip to UTC. Plus a "Previous run: Fri, Jun 12 (2 hours ago)" line, which helps me reason about whether it's currently firing.

## Still off / holdbacks
- **No "Copied!" confirmation** — both Copy and Copy link leave their label unchanged after click. Keyboard-first, I can't tell it fired without pasting. Tiny but real papercut.
- Permalink path is `/e/` not the documented `?expr=` — both work, but the URL-bar form after "Copy link" isn't human-pretty (`%2F` escaping). Fine to paste, slightly ugly in a PR comment.
- Still no per-field hover breakdown (which of the 5 fields → which clause) for gnarly expressions. crontab.guru has it; I'd use it occasionally. Not a blocker.

**Single biggest remaining holdback:** lack of click feedback on the copy buttons — the only thing between this and a 10. Everything I needed for the PR-review loop now works end to end.
