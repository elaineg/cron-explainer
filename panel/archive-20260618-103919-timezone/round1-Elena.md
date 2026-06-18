# Elena — Engineering manager

**Persona context:** 30-sec patience, half my day in meetings, want to settle an incident-review cron blame from my phone without pinging an engineer.

## 1. Advocacy: 9/10 — yes, I'd recommend it
I'd recommend this to my on-call engineers and to any PM in an incident channel. It's the rare utility that does exactly what it says, instantly, no signup, on my phone. The reason it isn't a 10: nothing here makes ME (a manager) come back daily — it's a "pull up when there's a cron argument" tool, which is exactly my use case, but the recurrence is incident-driven, not daily. For the moment I actually needed it, it nailed it.

## 2. Value clear within 30 sec? YES
Headline "Cron Explainer" + the subhead "Paste a cron expression and see what it means in plain English, plus its next 5 run times" told me everything before I scrolled. The input is pre-filled with a working example, so I instantly saw the shape of the output. No mystery, no setup, no "create an account to continue."

## 3. The incident-review win (the thing that matters to me)
The result panel shows **"Previous run: Wed, Jun 17, 2026, 12:00 PM (5 hours ago)"** ABOVE the next-5-runs. That line is the entire reason I'd open this in an incident review: someone says "the cron should have fired at noon" and I can paste the expression on my phone and confirm/deny in 5 seconds without DMing an engineer. That single feature moves this from "neat" to "I'll actually use this."

## Brutal friction
- **Biggest:** none that blocks me. The honest nit: the "Translate to Unix" output appears as a sub-card (`Unix: 0 12 * * 1-5` with Use/Copy) but does NOT change the big input field — for a half-second I thought Translate did nothing because the top expression stayed Quartz. A stressed manager mid-incident might miss the small translated line. A one-line "translated below ↓" cue or briefly highlighting the new card would remove all doubt. Minor.
- The dialect auto-detect hint ("6 fields with '?' ... — AWS EventBridge") is genuinely reassuring — it tells me WHY it read my expression a certain way, which preempts the exact "but it's Quartz not Unix" argument that starts these fights.
- Garbage input ("every 5 min weekdays") gave a clean "Invalid field count" + format hint, no crash. Good.

## Discoverability verdict (explicit)
I found the **DIALECT selector (Unix/Quartz/AWS) UNPROMPTED on cold load** — it sits right under the input, above the fold on my 375px phone. The **Translate control I found UNPROMPTED too**, but only AFTER I'd pasted an expression and a dialect was active: "Translate to: Unix / AWS" lives in the result-panel header, so it doesn't exist on the blank/cold screen. That's fine — it's contextual — but it means a cold visitor who only reads the homepage won't know translation exists until they paste something.

```json
{"tester": 4, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Translate output appears in a sub-card and does NOT update the main input field — easy to think it did nothing", "Translate control is invisible until you've pasted an expression — cold homepage doesn't advertise it"], "priorConcernsAddressed": "n/a"}
```
