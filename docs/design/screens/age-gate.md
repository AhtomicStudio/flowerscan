# Screen: Age gate (`/` on first visit, any route before confirmation)

Task: T-017 · Flow: [flows.md §1](../flows.md#1-first-run) · Mockup: `mockups/index.html#/age`

## Purpose
Block all content until the visitor says they're 21 or older (docs/09). Fast to pass, impossible to miss,
and nothing behind it loads.

## Layout (portrait, 390 × 844 reference)

```
┌──────────────────────────────┐
│                              │
│        [wordmark]            │  top third: placeholder wordmark (Roy)
│                              │
│   Are you 21 or older?       │  title (display, 26)
│   FlowerScan is for adults   │  body, text-2
│   21 and older.              │
│                              │
│                              │
│  ┌────────────────────────┐  │
│  │   I'm 21 or older      │  │  primary, full width, 52 px
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │  12 px gap
│  │        Leave           │  │  secondary, full width
│  └────────────────────────┘  │
│  We'll remember this on      │  caption, text-3
│  this phone.                 │
└──────────────────────────────┘
```

- Buttons in the bottom 40% (one-thumb). No tab bar, no links into the app.
- Background `bg`, no imagery. Calm by design: this is a legal step, not a brand moment.

## Hierarchy
1. The question. 2. The answer buttons. 3. The "remembered" note.

## States

| State | Behavior |
| --- | --- |
| Default | As above. Nothing preselected. |
| Confirmed | Store `age_confirmed_at` (settings). Go to the original route (deep links preserved, F-02). For `/` or `/scan`, continue to the camera card or the live scanner. |
| Leave | Replace the route (history `replace`, so Back doesn't return to the gate) with the **exit screen**. |
| Exit screen | Wordmark, "FlowerScan is for adults 21 and older.", "Thanks for stopping by. FlowerScan stays closed on this device for 24 hours. You can close this tab." No buttons, no links, no content. |
| Blocked (within 24 h of Leave) | **Every route** (`/`, `/scan`, `/s/:id`, `/journal`…) shows only the exit screen, across reloads, new tabs and browser restarts. Stored on the device as `age_declined_at` (ISO datetime), next to `age_confirmed_at` in settings. Blocked while `0 ≤ now − age_declined_at < 24 h` (clock injected, as everywhere). Nothing behind the gate loads. |
| Block expired (≥ 24 h) | The **age gate** shows again (never the app directly). `age_declined_at` is cleared when the user answers the gate. |
| Storage unavailable | Gate still works. The confirmation or the block lives in memory only, so both last for the current session and the gate asks again next visit. No error shown (nothing the user can do). |
| Offline | Same as default (the shell is cached). |
| Large text 200% | Text wraps, buttons grow taller, page scrolls. Nothing truncates. |

## Copy (draft, for Roy's voice pass)
- Title: **Are you 21 or older?**
- Body: FlowerScan is for adults 21 and older.
- Primary: **I'm 21 or older**
- Secondary: **Leave**
- Caption: We'll remember this on this phone.
- Exit: **FlowerScan is for adults 21 and older.** Thanks for stopping by. FlowerScan stays closed on this device
  for 24 hours. You can close this tab.

docs/08 had "You must be 21+ to enter." with [I'm 21+]. Changed to a question plus a full-sentence answer, because
a yes/no question with matching answers is clearer, and "21+" in a button reads as a label, not a statement.
The age comes from the single constant (T-017, M-24), so the copy is templated: `Are you {age} or older?`.

## Accessibility
- `<main>` with an `<h1>` (the question). Focus starts on the `<h1>`, not on a button, so nothing is
  "preselected" for screen-reader users.
- Both buttons ≥ 52 px tall, full width, 12 px apart.
- No timeout.

## Decisions
- **Q-D1 (decided by the founders, 2026-10-26):** [Leave] blocks the app for **24 hours on this device**, then the
  gate shows again. A mis-tap costs a day; that's accepted. The exit copy says so plainly but doesn't invite a
  retry (no countdown, no "come back tomorrow"). Legal (Q10) still reviews the gate copy before launch.
- **Data:** `age_declined_at` is a new settings field. docs/04 (Settings) and the core settings schema need it;
  the coordinator owns that change. "Erase all data" clears it too, but it's unreachable while blocked.
