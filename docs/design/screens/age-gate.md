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
| Exit screen | Wordmark, "FlowerScan is for adults 21 and older.", "Thanks for stopping by. You can close this tab." No buttons, no content. A `sessionStorage` flag keeps this screen for the rest of the browser session (reload shows it again). A new session shows the gate again. |
| Storage unavailable | Gate still works. The confirmation lives in memory for the session, so it asks again next visit. No error shown (nothing the user can do). |
| Offline | Same as default (the shell is cached). |
| Large text 200% | Text wraps, buttons grow taller, page scrolls. Nothing truncates. |

## Copy (draft, for Roy's voice pass)
- Title: **Are you 21 or older?**
- Body: FlowerScan is for adults 21 and older.
- Primary: **I'm 21 or older**
- Secondary: **Leave**
- Caption: We'll remember this on this phone.
- Exit: **FlowerScan is for adults 21 and older.** Thanks for stopping by. You can close this tab.

docs/08 had "You must be 21+ to enter." with [I'm 21+]. Changed to a question plus a full-sentence answer, because
a yes/no question with matching answers is clearer, and "21+" in a button reads as a label, not a statement.
The age comes from the single constant (T-017, M-24), so the copy is templated: `Are you {age} or older?`.

## Accessibility
- `<main>` with an `<h1>` (the question). Focus starts on the `<h1>`, not on a button, so nothing is
  "preselected" for screen-reader users.
- Both buttons ≥ 52 px tall, full width, 12 px apart.
- No timeout.

## Open questions
- **Q-D1 (founders, legal Q10):** is "exit screen for the session, ask again next session" strong enough, or
  should "Leave" block for longer (e.g. 24 hours in `localStorage`)? Longer blocking punishes a mis-tap with no
  way back, and the gate is self-declared either way. Proposal: session only.
