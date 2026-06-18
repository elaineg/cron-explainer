# Aisha — Product designer

**Round 1 · cold load · desktop 1280px · trackpad**

## 1. Advocacy: 8/10 — yes, I'd recommend it
I'd bring this up the next time a dev drops a cron string in a spec. To whom: engineers,
PMs, and fellow designers who get handed schedule strings and don't want to keep a
crontab.guru tab pinned. Why not a 9/10: a couple of empty-state polish misses (below)
keep it from feeling fully airtight, and "judges craft hard" is my whole temperament — a
9 means zero rough edges and I found two.

## 2. Value clear in 30s? YES.
Title "Cron Explainer" + the subhead "Paste a cron expression and see what it means in
plain English, plus its next 5 run times — or describe a schedule in English and get the
cron generated for you. Supports Unix, Quartz/Spring, and AWS EventBridge." That sentence
does the whole job. The prefilled `*/15 9-17 * * MON-FRI` → "Every 15 minutes, between
09:00 AM and 05:59 PM, Monday through Friday" shows, doesn't tell. No ambiguity.

## 3. Brutal friction
**Biggest:** the EMPTY state is treated as an error. Clear the field and you get a pink
error box "Enter a cron expression." plus a stale hint line reading "@ macro — standard
Unix cron" (nonsense for a blank field — it's leftover parse state). An empty field on a
calm tool should be a neutral resting prompt, not red. It's the one moment the craft
slips and makes me feel I broke something I didn't. Easy fix, but it's exactly what I
notice.

Smaller: "Translate to" sits inside the result card on the right — slightly buried; I'd
want it a hair more prominent given it's a headline new feature.

**What's genuinely well-crafted:** pasting a 7-field Quartz string while on Unix
AUTO-DETECTED and switched the dialect to Quartz — that's considered. Translate-to-Unix
of `0 0 12 ? * WED` surfaced an HONEST warning "L, W, or # tokens can't be represented in
Unix 5-field cron" instead of faking a translation — I trust a tool that admits limits.
Invalid input gives a precise teaching error ("it has 4 fields. Expected at least 5…").
English→cron round-trips correctly, "Copied!" feedback fires, Local/UTC toggle + previous
run + relative times ("in 17 hours") are all there. There's even a documented GET API.
Copy verified visually; clipboard read succeeded in test env. No console errors.

## Discoverability of new controls
I FOUND BOTH UNPROMPTED on cold load. The "DIALECT  Unix | Quartz | AWS" segmented control
sits right under the input, labeled in caps; "Translate to  [Quartz] [AWS]" lives in the
top-right of the result card. Neither felt bolted on — the segmented control matches the
input/Local-UTC toggle styling, and translate offering only the OTHER two dialects (and
swapping when you change input) shows it's wired into one coherent model, not stapled on.

```json
{"tester": 4, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Empty field renders as a pink error with a stale '@ macro' hint instead of a neutral resting state", "'Translate to' control is slightly buried in the result card for a headline feature"], "priorConcernsAddressed": "n/a"}
```
