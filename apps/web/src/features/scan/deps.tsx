// Everything the scanner needs from the outside, injected once at the app root, so tests swap in fakes
// (FakeCamera, FakeDetector, MemoryBarcodeRepository, a fake readLabel) without touching real devices.
import { createContext, type ReactNode, useContext } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { KeyValueStore } from "../../app/age-gate";
import { createBrowserCamera } from "../../platform/camera/browser-camera";
import type { CameraService } from "../../platform/camera/camera-service";
import { type CodeDetector, createWorkerDetector } from "../../platform/detectors/code-detector";
import { createHaptics, type Haptics } from "../../platform/haptics/haptics";
import {
  type BarcodeMemoryRepository,
  MemoryBarcodeRepository,
} from "../../platform/storage/barcode-memory";
import { DexieBarcodeRepository } from "../../platform/storage/dexie-barcode-memory";
import { type CodeClassifier, createLocalCodeClassifier } from "./code-classifier";
import { createPerfStore, type PerfStats } from "./perf";
import { createOcrReadLabel, type ReadLabel } from "./read-label";
import { createScanSession, type ScanSession } from "./scan-session";

/** Timings, injectable so component tests run fast with real timers. */
export interface ScanTiming {
  /** Detection frame rate. */
  readonly fps: number;
  /** Lock-on (corners snap + one pulse) before the result or sheet opens. */
  readonly lockMs: number;
  /** "Still reading" / "taking longer than usual" / give up (docs/design/flows.md §2b). */
  readonly stillMs: number;
  readonly longMs: number;
  readonly failMs: number;
  /** A paused camera is released after this long (result or sheet left open). */
  readonly releaseMs: number;
  /** "Starting camera…" shows only if starting takes longer than this. */
  readonly startingHintMs: number;
}

export const DEFAULT_TIMING: ScanTiming = {
  fps: 10,
  lockMs: 460,
  stillMs: 1500,
  longMs: 5000,
  failMs: 15000,
  releaseMs: 30000,
  startingHintMs: 300,
};

export interface ScanDeps {
  readonly camera: CameraService;
  /** Created on first use and kept warm for the app's lifetime. */
  readonly detector: () => CodeDetector;
  readonly classifier: CodeClassifier;
  readonly memory: BarcodeMemoryRepository;
  readonly readLabel: ReadLabel;
  /** Warms the OCR worker on idle after the camera starts. */
  readonly prefetchOcr?: (() => void) | undefined;
  readonly haptics: Haptics;
  /** Where `intro_seen` lives (the same device store as the age gate until T-017's settings store). */
  readonly store: KeyValueStore;
  /** Monotonic ms, for durations. */
  readonly now: () => number;
  /** Wall clock, for confirmed_at. */
  readonly clock: () => Date;
  readonly session: StoreApi<ScanSession>;
  readonly perf: StoreApi<PerfStats>;
  readonly timing: ScanTiming;
  readonly userAgent: string;
  readonly standalone: boolean;
  /** Opens a link the user tapped (COA "Open link"), in a new tab. */
  readonly openUrl: (url: string) => void;
  readonly copyText: (text: string) => Promise<void>;
  /** The size of the one-time OCR download, for the progress pill. Null until T-011 knows it. */
  readonly ocrDownloadLabel: string | null;
}

export type ScanDepsOverrides = Partial<ScanDeps>;

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

export function createScanDeps(store: KeyValueStore, overrides: ScanDepsOverrides = {}): ScanDeps {
  let detector: CodeDetector | null = null;
  let ocr: ReturnType<typeof createOcrReadLabel> | null = null;
  const getOcr = () => {
    ocr ??= createOcrReadLabel();
    return ocr;
  };
  return {
    camera: overrides.camera ?? createBrowserCamera(),
    detector:
      overrides.detector ??
      (() => {
        detector ??= createWorkerDetector();
        return detector;
      }),
    classifier:
      overrides.classifier ?? createLocalCodeClassifier({ ownOrigins: [window.location.origin] }),
    memory:
      overrides.memory ??
      (hasIndexedDb() ? new DexieBarcodeRepository() : new MemoryBarcodeRepository()),
    readLabel: overrides.readLabel ?? ((frame, options) => getOcr().readLabel(frame, options)),
    prefetchOcr:
      overrides.prefetchOcr ??
      (overrides.readLabel === undefined ? () => void getOcr().prefetch() : undefined),
    haptics: overrides.haptics ?? createHaptics(),
    store: overrides.store ?? store,
    now: overrides.now ?? (() => performance.now()),
    clock: overrides.clock ?? (() => new Date()),
    session: overrides.session ?? createScanSession(),
    perf: overrides.perf ?? createPerfStore(),
    timing: overrides.timing ?? DEFAULT_TIMING,
    userAgent: overrides.userAgent ?? navigator.userAgent,
    standalone: overrides.standalone ?? isStandalone(),
    openUrl:
      overrides.openUrl ??
      ((url) => {
        window.open(url, "_blank", "noopener,noreferrer");
      }),
    copyText: overrides.copyText ?? ((text) => navigator.clipboard.writeText(text)),
    ocrDownloadLabel: overrides.ocrDownloadLabel ?? null,
  };
}

const ScanDepsContext = createContext<ScanDeps | null>(null);

export function ScanDepsProvider({ deps, children }: { deps: ScanDeps; children: ReactNode }) {
  return <ScanDepsContext.Provider value={deps}>{children}</ScanDepsContext.Provider>;
}

export function useScanDeps(): ScanDeps {
  const deps = useContext(ScanDepsContext);
  if (deps === null) throw new Error("useScanDeps needs a ScanDepsProvider");
  return deps;
}

/** `intro_seen` (docs/design/flows.md §1): the camera card shows once. */
export const INTRO_SEEN_KEY = "flowerscan.intro_seen";
