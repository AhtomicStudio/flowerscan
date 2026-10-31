// Scanner strings, from docs/design/screens/scanner.md, docs/design/flows.md §2b/§4/§4b/§5 and the T-021
// mockup. Draft copy pending Roy's voice pass (Q11). Items marked "interim" aren't in the design yet.
import { APP_NAME } from "../../app/copy";
import type { CameraFailure } from "../../platform/camera/camera-service";

export const SCAN_COPY = {
  screenLabel: "Scanner",
  hint: "Point at a barcode, or tap to read the name",
  aimHint: "Now tap to read the strain name",
  starting: "Starting camera…",
  moreLightTorch: "More light. Try the torch.",
  moreLight: "More light",
  barcodeFound: "Barcode found",
  qrFound: "QR code found",
  reading: "Reading label…",
  stillReading: "Still reading. Hold on…",
  takingLong: "This is taking longer than usual.",
  keepWaiting: "Keep waiting",
  searchInstead: "Search instead",
  downloading: (size: string) => `Getting text reading ready (one-time, ${size})…`,
  downloadLabel: "Download progress",
  shutter: "Read label text",
  search: "Search",
  torchOn: "Turn on torch",
  torchOff: "Turn off torch",
  startCamera: "Start camera",
  startCameraNote: "Your browser will ask for camera access.",
  // Live region (docs/design/screens/_shared-components.md).
  announceStarting: "Starting camera",
  announceReady: "Ready to scan",
  announceReading: "Reading label",
  announceStill: "Still reading",
  announceLong: "Taking longer than usual",
} as const;

export const CARD_COPY = {
  title: "Point at a package. We'll show you what's in its family tree.",
  body: "We use your camera to read labels.",
  bodyStrong: "Photos never leave your phone.",
  continue: "Continue",
  typeInstead: "Type a name instead",
} as const;

export interface PanelCopy {
  readonly title: string;
  readonly body: string;
}

export const CAMERA_OFF_COPY: Record<CameraFailure, PanelCopy> = {
  denied: {
    title: `Camera is off for ${APP_NAME}`,
    body: "You can still search by name. To scan, turn the camera on:",
  },
  "not-found": {
    title: "We can't find a camera on this device.",
    body: "Search works just as well.",
  },
  busy: {
    title: "Your camera is busy.",
    body: "Another app might be using it. Close it, then try again.",
  },
  unsupported: {
    title: "This browser can't open the camera.",
    body: `Open ${APP_NAME} in Safari or Chrome to scan. In an app like Instagram, tap ••• and choose Open in browser.`,
  },
};

export const CAMERA_ACTIONS = {
  searchByName: "Search by name",
  tryAgain: "Try again",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  stillOff: "Still off. Change the setting, then try again.",
} as const;

/** "Turn the camera on" steps, one set per browser (docs/design/screens/scanner.md). */
export interface HowToSteps {
  readonly heading: string;
  readonly steps: readonly string[];
}

export const HOWTO: Record<
  "ios-safari" | "ios-standalone" | "android-chrome" | "other",
  HowToSteps
> = {
  "ios-safari": {
    heading: "iPhone, Safari",
    steps: ["Tap aA in the address bar.", "Tap Website Settings, then Camera, then Allow."],
  },
  "ios-standalone": {
    heading: "iPhone, Home Screen app",
    steps: [
      "Open the Settings app.",
      "Tap Apps, then Safari, then Camera, then Allow.",
      `Reopen ${APP_NAME}.`,
    ],
  },
  "android-chrome": {
    heading: "Android, Chrome",
    steps: [
      "Tap the settings icon left of the address.",
      "Tap Permissions, then Camera, then Allow.",
    ],
  },
  other: {
    heading: "Other browsers",
    steps: ["Open this site's settings in your browser and allow the camera."],
  },
};

export const SHEET_COPY = {
  close: "Close",
  expand: "Expand",
  collapse: "Collapse",
  scanTheLabel: "Scan the label",
  searchByName: "Search by name",
  openLink: "Open link",
  unknownBarcode: {
    title: "We don't know this barcode yet",
    body: "Cannabis barcodes aren't in any public list, so we learn them on your phone. Scan the strain name once and we'll remember it next time.",
    /** Interim: formats we never learn (Code 39, Data Matrix, PDF417) can't promise "we'll remember". */
    bodyNotLearnable: "It doesn't name the strain. Scan the strain name instead.",
    value: (value: string) => `Barcode ${value}`,
  },
  tracking: {
    title: "That's a tracking code",
    body: "It's unique to this one package, so it can't tell us the strain. Scan the strain name instead.",
    value: (value: string) => `Tracking code ${value}`,
  },
  coa: {
    title: "That QR is for lab results",
    body: "It doesn't name the strain. Scan the strain name instead.",
    value: (host: string) => `Link: ${host}`,
  },
  traceability: {
    title: "That QR is a tracking code",
    body: "It doesn't name the strain. Scan the strain name instead.",
    value: (host: string) => `Link: ${host}`,
  },
  announceCode: "Barcode not recognized",
  which: {
    title: "Which one is it?",
    body: (read: string) => `We read “${read}”. Pick the one on your package.`,
    none: "None of these",
    remember: "We'll remember your pick for this barcode, on this phone.",
    announce: (n: number) => `${n} possible matches`,
  },
  cross: {
    title: "That looks like a cross of two strains",
    body: (read: string) =>
      `We read “${read}”. We don't have this cross yet. Here are its parents.`,
    parent: "Parent, not a match",
    announce: (n: number) => `Cross of two strains. ${n} parents shown`,
  },
  noMatch: {
    title: "We couldn't find a strain in that label.",
    body: "Here's what we read. Fix it and search, or try again.",
    label: "What we read",
    placeholder: "Type the strain name",
    search: "Search",
    tryAgain: "Try again",
    announce: "No match found",
  },
  nothingRead: {
    title: "We couldn't read any text there.",
    body: "Fill the frame with the strain name, and try the torch.",
    announce: "No text found",
  },
  readFailed: {
    title: "We couldn't read that label.",
    body: "Fill the frame with the strain name, and try the torch.",
    tryAgain: "Try again",
    announce: "Couldn't read the label",
  },
  offline: {
    title: "Text reading needs a one-time download.",
    body: "Barcodes and search work offline.",
    ok: "OK",
  },
  downloadFailed: {
    title: "Text reading didn't download.",
    body: "Check your connection and try again. Barcodes and search still work.",
    tryAgain: "Try again",
  },
  /** Interim, until T-011 wires in the OCR engine. */
  unavailable: {
    title: "Text reading isn't ready yet.",
    body: "Barcodes and search work. Point at a barcode or QR code, or search by name.",
    ok: "OK",
  },
} as const;

/** "Barcode 0 12345 67890 5": UPC-A grouped like the printed digits; others as read. */
export function formatBarcode(value: string, format: string): string {
  if (format === "upc_a" && /^\d{12}$/.test(value)) {
    return `${value[0]} ${value.slice(1, 6)} ${value.slice(6, 11)} ${value[11]}`;
  }
  if (format === "ean_13" && /^\d{13}$/.test(value)) {
    return `${value[0]} ${value.slice(1, 7)} ${value.slice(7)}`;
  }
  return value;
}

/** "1A4F…0042": long tracking UIDs are shortened, as in the T-021 mockup. */
export function shortCode(value: string): string {
  return value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
