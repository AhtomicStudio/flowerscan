// App shell strings: the age gate, the exit screen and the unknown-page screen.
// Draft copy from docs/design/screens/age-gate.md, pending Roy's voice pass and legal review (Q10).
import { MIN_AGE } from "./age-gate";

export const APP_NAME = "FlowerScan";

export const GATE_COPY = {
  title: `Are you ${MIN_AGE} or older?`,
  body: `${APP_NAME} is for adults ${MIN_AGE} and older.`,
  confirm: `I'm ${MIN_AGE} or older`,
  leave: "Leave",
  caption: "We'll remember this on this phone.",
} as const;

export const EXIT_COPY = {
  title: `${APP_NAME} is for adults ${MIN_AGE} and older.`,
  body: `Thanks for stopping by. ${APP_NAME} stays closed on this device for 24 hours. You can close this tab.`,
} as const;

export const NOT_FOUND_COPY = {
  title: "We can't find that page.",
  body: "The link may be old.",
  action: "Search strains",
} as const;
