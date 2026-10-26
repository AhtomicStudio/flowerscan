# Hallway test script: the 3 core flows

Owner: product-designer (T-021) · Runs: before launch (test-plan type **H**, F-22). Running it needs its own task
(test-plan gap 12). · Date: 2026-10-26

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
| Props | 3 **mock packages we make ourselves** (docs/09: no real brands' art). Package 1: a strain from the seed set printed large, plus a fake UPC. Package 2: a name that triggers "Which one?" (a name whose number is missing, e.g. a seed strain printed without its `#4`). Package 3: a made-up name not in the database. One package also prints "Indica" where the lineage leans sativa-dominant (choose from the seed data once T-007 lands). |
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

**Success:** the result sheet is visible for the right strain.
Then ask, without letting them look away from the screen:
1. "What kind of strain is it?" (Expect the class word. Note if they read the percentage.)
2. "What does the number mean to you?" (Listen for "lab test" / "THC" / "how strong" misreadings. The meter is
   **not** potency.)
3. "What does '{chip text}' mean?" (Hallway check for the confidence chip, benchmark implication: nobody has
   a learned model for it.)
4. "How would you find out how the app knows that?" (Do they find "How we know"?)
5. "Keep this one so you can find it later." (Save. Do they find it? Do they notice the rating row?)

Then hand them the disagreeing package if it's not Package 1:
6. "Now scan this one." Afterwards: "Anything surprising?" (Do they notice and understand the package-says
   callout? Do they trust the app or the package more, and why?)

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
- **Meter read as potency or lab result:** yes / no
- **Chip understood:** yes / partly / no
- **Found How we know:** yes / no
- **Callout understood:** yes / no / didn't notice

## Pass criteria (proposed; founders can adjust)

| Measure | Pass |
| --- | --- |
| Task 1 success | ≥ 4 of 5, median time ≤ 20 s from tapping the scanner to the result |
| Task 2 success | ≥ 4 of 5, nobody confidently picks a wrong strain |
| Task 3 success | ≥ 4 of 5, **nobody believes a strain was identified** |
| Meter read as potency | ≤ 1 of 5 (2+ = redesign the meter labels) |
| Chip understood | ≥ 3 of 5 "yes" (2+ "no" = rewrite the chip copy) |
| Callout understood | ≥ 4 of 5 of those who saw it |

**Fix rule:** any issue seen in 2+ participants gets a fix task before launch. Log every issue with the
participant numbers that hit it.

## Results template

```
## Hallway test YYYY-MM-DD (build <sha>, dataset <version>)
Participants: P1 … P5 (profile only, no names)
| Task | Success | Median time | Issues (participants) |
| 1 | 4/5 | 14 s | Meter read as THC (P2, P4) → fix task T-0NN |
…
Top 3 issues → tasks: …
```
