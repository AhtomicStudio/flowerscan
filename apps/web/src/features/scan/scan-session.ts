// The scan session (T-009): one Zustand store per app, driven by a pure reducer so every transition is
// unit-tested. idle → priming → live → capturing → processing → result | choose | none, plus the camera
// states (start, starting, off) and the code states (locked, code sheet).
import type { ScanBarcodeFormat } from "@flowerscan/core";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { CameraFailure, CameraPermission } from "../../platform/camera/camera-service";
import { CodeCooldown } from "./code-cooldown";
import type { Rect } from "./geometry";
import type { ReadFailure } from "./read-label";
import type { ScanOutcome } from "./scan-outcome";

/** The dead-end sheets for codes that don't name a strain (docs/design/flows.md §4b). */
export type CodeSheetModel =
  | {
      readonly kind: "unknown-barcode";
      readonly value: string;
      readonly format: ScanBarcodeFormat;
      readonly learnable: boolean;
    }
  | { readonly kind: "tracking"; readonly value: string }
  | { readonly kind: "coa"; readonly url: string }
  | { readonly kind: "traceability"; readonly url: string };

export interface LockTarget {
  /** Where the corners go, relative to the viewport element. Null → stay on the reticle. */
  readonly rect: Rect | null;
  readonly isQr: boolean;
}

export type ProcessingStage = "reading" | "still" | "long";

export type ScanPhase =
  | { readonly name: "idle" }
  | { readonly name: "priming" }
  | { readonly name: "start" }
  | { readonly name: "starting" }
  | { readonly name: "off"; readonly failure: CameraFailure; readonly stillOff: boolean }
  | { readonly name: "live" }
  | { readonly name: "locked"; readonly target: LockTarget }
  | { readonly name: "capturing" }
  | { readonly name: "processing"; readonly stage: ProcessingStage }
  | { readonly name: "result"; readonly strainId: string }
  | { readonly name: "choose"; readonly outcome: Extract<ScanOutcome, { kind: "choose" }> }
  | { readonly name: "none"; readonly outcome: Extract<ScanOutcome, { kind: "none" }> }
  | { readonly name: "code"; readonly sheet: CodeSheetModel }
  | { readonly name: "failed"; readonly reason: ReadFailure };

export type ScanEvent =
  | {
      readonly type: "boot";
      readonly supported: boolean;
      readonly permission: CameraPermission;
      readonly introSeen: boolean;
    }
  /** Continue on the card, Start camera, Try again, or coming back to a paused/stopped scanner. */
  | { readonly type: "request" }
  | { readonly type: "ready" }
  | { readonly type: "fail"; readonly failure: CameraFailure }
  | { readonly type: "still-off" }
  | { readonly type: "lock"; readonly target: LockTarget }
  | { readonly type: "open-code"; readonly sheet: CodeSheetModel }
  | { readonly type: "open-result"; readonly strainId: string }
  | { readonly type: "shutter" }
  | { readonly type: "captured" }
  | { readonly type: "slow"; readonly stage: ProcessingStage }
  | { readonly type: "decided"; readonly outcome: Exclude<ScanOutcome, { kind: "accept" }> }
  | { readonly type: "read-failed"; readonly reason: ReadFailure }
  /** A sheet or the result closed: back to the camera (via starting, which resumes or restarts it). */
  | { readonly type: "close" }
  | { readonly type: "reset" };

/** Phases with a modal sheet over the frozen scanner. */
export const SHEET_PHASES = new Set<ScanPhase["name"]>(["choose", "none", "code", "failed"]);

/** Phases where the camera should be delivering frames. */
export const RUNNING_PHASES = new Set<ScanPhase["name"]>(["starting", "live"]);

export function isSheet(phase: ScanPhase): boolean {
  return SHEET_PHASES.has(phase.name);
}

/** The pure transition function. Events that don't apply to the current phase are ignored. */
export function reduce(phase: ScanPhase, event: ScanEvent): ScanPhase {
  switch (event.type) {
    case "reset":
      return { name: "idle" };
    case "boot": {
      if (phase.name !== "idle") return phase;
      if (!event.supported) return { name: "off", failure: "unsupported", stillOff: false };
      if (event.permission === "granted") return { name: "starting" };
      if (event.permission === "denied") return { name: "off", failure: "denied", stillOff: false };
      return event.introSeen ? { name: "start" } : { name: "priming" };
    }
    case "request":
      if (phase.name === "off" && phase.failure !== "denied" && phase.failure !== "busy") {
        // No camera / unsupported: nothing to retry.
        return phase;
      }
      // From the camera states only (a live scanner restarts after the tab was hidden). Sheets, the
      // result and a read in progress close through their own events.
      return phase.name === "priming" ||
        phase.name === "start" ||
        phase.name === "off" ||
        phase.name === "live"
        ? { name: "starting" }
        : phase;
    case "ready":
      return phase.name === "starting" ? { name: "live" } : phase;
    case "fail":
      return phase.name === "starting" || phase.name === "live" || phase.name === "off"
        ? { name: "off", failure: event.failure, stillOff: false }
        : phase;
    case "still-off":
      return phase.name === "off" && phase.failure === "denied"
        ? { name: "off", failure: "denied", stillOff: true }
        : phase;
    case "lock":
      return phase.name === "live" ? { name: "locked", target: event.target } : phase;
    case "open-code":
      return phase.name === "locked" ? { name: "code", sheet: event.sheet } : phase;
    case "open-result":
      return phase.name === "locked" ||
        phase.name === "processing" ||
        phase.name === "choose" ||
        phase.name === "none"
        ? { name: "result", strainId: event.strainId }
        : phase;
    case "shutter":
      return phase.name === "live" ? { name: "capturing" } : phase;
    case "captured":
      return phase.name === "capturing" ? { name: "processing", stage: "reading" } : phase;
    case "slow":
      return phase.name === "processing" ? { name: "processing", stage: event.stage } : phase;
    case "decided":
      // From a read, a locked QR with candidates, or "None of these" on the choose sheet.
      if (phase.name !== "processing" && phase.name !== "locked" && phase.name !== "choose") {
        return phase;
      }
      if (event.outcome.kind === "choose") return { name: "choose", outcome: event.outcome };
      if (event.outcome.kind === "none") return { name: "none", outcome: event.outcome };
      return phase;
    case "read-failed":
      return phase.name === "capturing" || phase.name === "processing"
        ? { name: "failed", reason: event.reason }
        : phase;
    case "close":
      return isSheet(phase) || phase.name === "result" || phase.name === "locked"
        ? { name: "starting" }
        : phase;
  }
}

/** A barcode waiting for its strain: the next confirmed scan teaches barcode memory (P13). */
export interface PendingBarcode {
  readonly value: string;
  readonly format: ScanBarcodeFormat;
}

export interface ScanSession {
  readonly phase: ScanPhase;
  /** "Now tap to read the strain name" (after Scan the label or Try again). Cleared by the next read. */
  readonly aim: boolean;
  /** Bumped to replay the reticle's "ready" breath (after Scan another). */
  readonly readyBreath: number;
  /** Bumped to replay the shutter pulse (aim mode). */
  readonly shutterPulse: number;
  readonly pendingBarcode: PendingBarcode | null;
  /** The code that opened the current sheet or result; muted when the scanner is live again. */
  readonly lastCodeKey: string | null;
  /** Survives sheets, results and remounts (the package is usually still in frame). */
  readonly cooldown: CodeCooldown;
  dispatch(event: ScanEvent): void;
  set(patch: Partial<Omit<ScanSession, "dispatch" | "set" | "cooldown">>): void;
}

export function createScanSession(): StoreApi<ScanSession> {
  return createStore<ScanSession>()((setState) => ({
    phase: { name: "idle" },
    aim: false,
    readyBreath: 0,
    shutterPulse: 0,
    pendingBarcode: null,
    lastCodeKey: null,
    cooldown: new CodeCooldown(),
    dispatch: (event) => setState((state) => ({ phase: reduce(state.phase, event) })),
    set: (patch) => setState(patch),
  }));
}
