# Sam — Round 2
- advocacy: 9
- clarity: Yes
- value: Yes
- prior concerns addressed: Yes — the two TZ selectors are now paired in ONE card under the input; which-is-which is obvious on mobile with no scrolling.

## What I did
Opened cold at 375px. Pasted `0 9 * * MON-FRI`. Set RUNS IN = Europe/Berlin and SHOW TIMES IN = Asia/Tokyo via the "Other…" pickers (typing "Berlin"/"Tokyo" surfaced a single clean IANA match each). Copied the permalink and reopened it in a fresh browser: cron, source=Berlin, display=Tokyo ALL restored, and the "Runs in Europe/Berlin · shown in Asia/Tokyo" summary line reappeared in the NEXT 5 RUNS card. Plain-English gloss + 5 future runs all rendered. This is exactly my ticket workflow: cron + gloss + shareable link in one paste.

## Friction (brutally honest)
- The "Other…" placeholder is STILL the weakest spot. It's a city/timezone search box but reads like a generic "other option" fallback. I only knew to type "Berlin" because I went looking; a stakeholder might not realize it's a searchable picker. Calling it "Search city or zone…" would fix it instantly. This is what keeps me off a 10.
- The permalink `?tz=` (display) / `?src=` (source) being swapped vs the API's `?tz=` (source) is still present, now documented in the DEVELOPERS footer. It's honest but it IS a footgun if an engineer hand-edits the link expecting API semantics. Minor, but it's a "huh, why" moment.
- Tiny: the source/display section has no one-glance proof I picked the right direction until I scroll to the NEXT 5 RUNS summary line. The summary line is great — I'd love it echoed right in the paired card too.

## On the timezone feature specifically
Fixed and good. RUNS IN and SHOW TIMES IN are now stacked in a single bordered card directly under the cron input — on mobile I see both at once, each with its own clear label, Local/UTC toggle, and city picker. No more hunting for a buried DISPLAY control inside the runs card. The redundant "Runs in Berlin · shown in Tokyo" sentence in the results is a nice belt-and-suspenders confirmation. This was my gating gripe last round and it's genuinely resolved; the only thing between this and a 10 is the unlabeled "Other…" picker.
