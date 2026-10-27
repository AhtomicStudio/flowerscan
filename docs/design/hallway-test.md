# Hallway test script: the 3 core flows

Owner: product-designer (T-021) · Runs: before launch (test-plan type **H**, F-22). Running it needs its own task
(test-plan gap 12). · Date: 2026-10-26 · Revised 2026-10-26 for the simplified screens (no meter, no chip, no
package-says callout, no Share; Scan another added). Pass criteria stay as the founders approved (Q-D7); only the
checks for removed elements were dropped and a Scan another check was added. Revised again 2026-10-27 (D13–D15:
full-screen answer, no dominance on the answer, Hybrid only at exactly 50): added the 2-second answer check, and
the basis term now lives in the details below the fold.

## Goal
Find out whether 5 people who've never seen FlowerScan can (1) get a result from a package, (2) resolve a close
call, and (3) recover from a no match, and whether they understand what the result *means*. docs/08 rule:
**anything 2 or more people stumble on gets fixed before launch.**

## Setup

| Item | Detail |
| --- | --- |
| Participants | 5 adults, **21+ (check ID)**, mixed: at least 2 who buy cannabis regularly, 1 who rarely does, 1 who uses a screen reader or large text if we can find them. No team members, no friends who've seen the app. |
| Device | Their own phone if possible (the camera prompt and browser are part of the test). Fallback: the Android reference phone and an iPhone. |
| Build | A preview deploy with the seed dataset, in a fresh browser profile (age gate and camera prompt not yet answered). Before the app exists: `docs/design/mockups/index.html` with the Prototype menu hidden (the mockup simulates the camera; note this in results). |
| Props | 3 **mock packages we make ourselves** (docs/09: no real brands' art). Package 1: a strain from the seed set printed large, plus a fake UPC. Package 2: a name that triggers "Which one?" (a name whose number is missing, e.g. a seed strain printed without its `#4`). Package 3: a made-up name not in the database. One package also prints "Indica" where the lineage leans sativa-dominant (choose from the seed data once T-007 lands): the result no longer calls this out, so we watch whether anyone notices or minds. Package 4: any second seed strain, for the Scan another check. |
| Roles | 1 facilitator (talks), 1 note-taker (times and quotes). |
| Recording | Notes and timings only. No video of faces. If screen recording, ask first and delete after analysis. |
| Time | 20 minutes per person. |

## Facilitator script (read aloud)

> "Thanks for helping. We're testing the app, not you, so anything confusing is our fault and really useful to
> hear. Please think out loud as you go: what you're looking at, what you expect, what surprises you. I can't
> help you during the tasks, but I'll answer questions at the end. You can stop any time."

Hand them the phone (or ask them to open the link). **Don't** explain what the app does beyond: "This app is
about cannabis packages."

## Tasks

Start a timer when you finish reading the task. Stop it when the success condition is met, or at the time cap.
Don't hint. If they're stuck at the cap, say "Thanks, let's move on" and mark it a failure.

### Task 0: first open (warm-up, not scored on time)
> "Open the app however you'd normally open a link."

Observe: age gate (do they hesitate?), the camera card (do they read it? tap Continue or "Type a name
instead"?), the browser prompt (allow or block?).
- If they block the camera: let them continue. Note whether the "Camera is off" panel gets them to search on
  their own. (That's a bonus observation of the permission-denied flow.)

### Task 1: scan → result (cap 90 s)
> "You're in a store and you picked up this package [Package 1]. Use the app to find out what kind of strain it is."

**Success:** the full-screen result is visible for the right strain.
The note-taker starts a stopwatch the moment the screen floods with color. Then ask, without letting them look
away from the screen:
1. "What kind of strain is it?" Ask it **as soon as the color appears**, and stop the stopwatch when they say the
   answer. (Expect the class word: Indica, Sativa or Hybrid. **Measure: answer stated within 2 s of the result
   appearing.** Also note if they read the color or word as strength or as a promised effect, e.g. "it'll make me
   sleepy".)
2. "How sure is the app about that? Where would you look?" (Do they find "Details" and the basis line? Then: "What
   does '{basis term}' mean?" for "Lineage traced", "Partly traced" or "Reported type". Nobody has a learned model
   for these.)
3. "How would you find out how the app knows that?" (Do they open "How we know"? Do they understand the lean line,
   e.g. "Leans sativa (sativa-dominant)", as detail on top of the answer and not a contradiction?)
4. "Keep this one so you can find it later." (Save. Do they find it as the secondary button? Do they notice the
   rating row?)
5. Hand them Package 4: "Now check this one." (Scan another. **Success:** they get from the result back to a live
   scanner and scan Package 4 without help. Note whether they use Scan another, the close button, or a swipe,
   and the time from the first result to the second.)

Then hand them the disagreeing package if it's not Package 1:
6. "Now scan this one." Afterwards: "Anything surprising?" (Do they notice that the package's printed type differs
   from the app's answer? If they do, are they confused, and do they find "Package says …" in How we know? Do they
   trust the app or the package more, and why?)

Since D15, Hybrid only means an exactly balanced family tree, but many packages print "Hybrid". Expect most
"Hybrid" packages to come back as Indica or Sativa. Use at least one such package (Package 1 can be it) and record
the reaction.

### Task 2: close call (cap 60 s)
> "Now try this one [Package 2]."

**Success:** they pick the candidate that matches the package (or "None of these" if none does) and reach a
result.
Ask: "How did you decide which one?" (Did the mini pill or the number help or mislead?)

### Task 3: no match (cap 90 s)
> "Try this one [Package 3]."

**Success:** they reach a sensible next step on their own: edit the text and search, or tap "Try again", or
"Save anyway", and can say in their own words that the app doesn't know this strain.
**Failure signal:** they believe the app identified a strain, or they get stuck with no next step.
Ask: "What would you do now if you really wanted to know?"

### Task 4: find it again (cap 45 s, optional)
> "Find the first package you saved."

**Success:** they open the Journal entry.

## After the tasks (2 minutes)
1. "In one sentence, what does this app do?"
2. "Was anything confusing or annoying?"
3. "Would you use this in a store? Why or why not?"
4. "On a scale of 1–5, how much do you trust the result? Why?"
5. One word to describe how it felt.

## What to record (per participant)

| Field | Task 1 | Task 2 | Task 3 | Task 4 |
| --- | --- | --- | --- | --- |
| Success (Y / N / assisted) | | | | |
| Time (s) | | | | |
| Errors (wrong taps, back-tracks) | | | | |
| Quote | | | | |

Plus for Task 1: answers to questions 1–6, verbatim where possible. Tag each answer:
- **Answer stated within 2 s of the result appearing:** yes / no, and the time (s)
- **Class word read as strength or a promised effect:** yes / no (observation, no pass threshold)
- **"Hybrid" package answered Indica/Sativa:** noticed and fine / noticed and confused / didn't notice (observation)
- **Basis term understood:** yes / partly / no
- **Found How we know:** yes / no
- **Scan another without help:** yes / no, and the time (s) from result to the next result
- **Noticed the package/app difference:** yes, and it confused them / yes, fine / didn't notice (observation)

## Pass criteria (proposed; founders can adjust)

| Measure | Pass |
| --- | --- |
| Task 1 success | ≥ 4 of 5, median time ≤ 20 s from tapping the scanner to the result |
| Task 2 success | ≥ 4 of 5, nobody confidently picks a wrong strain |
| Task 3 success | ≥ 4 of 5, **nobody believes a strain was identified** |
| Basis term understood (the former "chip understood" check, same thresholds) | ≥ 3 of 5 "yes" (2+ "no" = rewrite the basis-line copy) |
| Scan another (added 2026-10-26) | ≥ 4 of 5 reach the next result without help |
| Answer in 2 s (added 2026-10-27, D13) | ≥ 4 of 5 say the class word within 2 s of the result appearing |

Dropped 2026-10-26 because the elements no longer exist: "Meter read as potency" (no meter, no percentage) and
"Callout understood" (no callout). If 2+ people are confused by an unflagged package/app difference (question 6),
that's an issue under the fix rule, and the fix discussion should consider bringing back a plain one-line note.

**Fix rule:** any issue seen in 2+ participants gets a fix task before launch. Log every issue with the
participant numbers that hit it.

## Results template

```
## Hallway test YYYY-MM-DD (build <sha>, dataset <version>)
Participants: P1 … P5 (profile only, no names)
| Task | Success | Median time | Issues (participants) |
| 1 | 4/5 | 14 s | "Reported type" misread as "the package's type" (P2, P4) → fix task T-0NN |
…
Top 3 issues → tasks: …
```
