// The scanner (docs/design/screens/scanner.md): home of the app. Live rear camera, reticle, one shutter.
// Auto only (D7): barcodes and QR codes are read continuously in a worker; the shutter reads label text.
// Frames go to our own workers and nowhere else (docs/09).
import type { PackageSays } from "@flowerscan/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  currentNavState,
  Link,
  navigate,
  nextDepth,
  SEARCH_PATH,
  searchPath,
  strainPath,
} from "../../app/router";
import { useStrainData } from "../../data/data-context";
import type { StrainData } from "../../data/load-data";
import {
  type CameraCapabilities,
  CameraError,
  type FrameRegion,
} from "../../platform/camera/camera-service";
import type { DetectedCode } from "../../platform/detectors/protocol";
import { codeKey } from "../../platform/detectors/stability-gate";
import { learnedMemory, recallBarcode, sightedMemory } from "../../platform/storage/barcode-memory";
import { Icon } from "../../ui/icons";
import { useAnnounce } from "../../ui/live-region";
import { PACKAGE_RESULT_ID } from "../result/result-model";
import { CameraCard } from "./CameraCard";
import { CameraOffPanel } from "./CameraOffPanel";
import { SCAN_COPY } from "./copy";
import { DebugOverlay } from "./DebugOverlay";
import { INTRO_SEEN_KEY, useScanDeps } from "./deps";
import { runDetectionLoop, type StableMeta } from "./detection-loop";
import { debugEnabled } from "./environment";
import {
  coverMap,
  frameToElement,
  padRect,
  type Rect,
  reticleCrop,
  visibleRegion,
} from "./geometry";
import { LightCoach } from "./light-coach";
import { FpsMeter, mark } from "./perf";
import { Reticle } from "./Reticle";
import { type DownloadProgress, type LabelReading, ReadLabelError } from "./read-label";
import { type CodeAction, classifyCodes, pickCode, resolveCodes } from "./resolve-codes";
import { ScanIcon } from "./ScanIcon";
import { ChooseSheet, CodeSheet, NoMatchSheet, ReadErrorSheet } from "./ScanSheets";
import { outcomeFor } from "./scan-outcome";
import { type CodeSheetModel, isSheet, type PendingBarcode, type ScanPhase } from "./scan-session";
import "./scanner.css";

type CloseIntent = "close" | "scan-label" | "try-again";

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Fractions of the viewport, for the result flood's starting point. */
function fractionOf(rect: Rect | null, root: DOMRect | null): { x: number; y: number } {
  if (rect === null || root === null || root.width === 0 || root.height === 0) {
    return { x: 0.5, y: 0.4 };
  }
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x: clamp((rect.left + rect.width / 2) / root.width),
    y: clamp((rect.top + rect.height / 2) / root.height),
  };
}

export function ScannerScreen({ active }: { active: boolean }) {
  const deps = useScanDeps();
  const { camera, session, timing, perf } = deps;
  const phase = useStore(session, (s) => s.phase);
  const aim = useStore(session, (s) => s.aim);
  const readyBreath = useStore(session, (s) => s.readyBreath);
  const shutterPulse = useStore(session, (s) => s.shutterPulse);
  const pendingBarcode = useStore(session, (s) => s.pendingBarcode);
  const { state: dataState } = useStrainData();
  const announce = useAnnounce();
  const visible = usePageVisible();
  const [debug] = useState(() => debugEnabled(window.location.search, sessionStore()));

  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const freezeCanvas = useRef<HTMLCanvasElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const shutter = useRef<HTMLButtonElement>(null);
  const [frozen, setFrozen] = useState(false);
  const [flash, setFlash] = useState(0);
  const [caps, setCaps] = useState<CameraCapabilities>({ torch: false });
  const [torchOn, setTorchOn] = useState(false);
  const [darkFrame, setDarkFrame] = useState(false);
  const [download, setDownload] = useState<DownloadProgress | null>(null);
  const [startingHint, setStartingHint] = useState(false);
  const [keepWaiting, setKeepWaiting] = useState(false);

  const readAbort = useRef<AbortController | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeIntent = useRef<CloseIntent>("close");
  const focusShutterOnLive = useRef(false);
  const floodOrigin = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.4 });
  const dataRef = useRef(dataState);
  dataRef.current = dataState;
  const dataWaiters = useRef<((data: StrainData | null) => void)[]>([]);

  const dispatch = session.getState().dispatch;
  const phaseNow = useCallback((): ScanPhase => session.getState().phase, [session]);

  // ---------------------------------------------------------------------------------------- geometry
  const rootRect = (): DOMRect | null => {
    const rect = root.current?.getBoundingClientRect();
    return rect === undefined || rect.width === 0 || rect.height === 0 ? null : rect;
  };

  const detectRegion = useCallback((): FrameRegion | null => {
    const frame = camera.frameSize();
    const rect = root.current?.getBoundingClientRect();
    if (frame === null || rect === undefined || rect.width === 0 || rect.height === 0) return null;
    return visibleRegion(frame, rect);
  }, [camera]);

  const ocrRegion = (): FrameRegion | null => {
    const frame = camera.frameSize();
    const outer = rootRect();
    const inner = reticle.current?.getBoundingClientRect();
    if (frame === null || outer === null || inner === undefined || inner.width === 0) return null;
    return reticleCrop(
      {
        left: inner.left - outer.left,
        top: inner.top - outer.top,
        width: inner.width,
        height: inner.height,
      },
      frame,
      outer,
    );
  };

  const boxOnScreen = (code: DetectedCode): Rect | null => {
    const frame = camera.frameSize();
    const outer = rootRect();
    if (frame === null || outer === null) return null;
    const rect = frameToElement(code.box, coverMap(frame, outer));
    const pad = 8;
    const min = 48;
    const grown = padRect(rect, pad);
    const width = Math.max(min, grown.width);
    const height = Math.max(min, grown.height);
    return {
      left: grown.left - (width - grown.width) / 2,
      top: grown.top - (height - grown.height) / 2,
      width,
      height,
    };
  };

  // ------------------------------------------------------------------------------------ freeze/pause
  const freeze = useCallback(() => {
    const source = video.current;
    const canvas = freezeCanvas.current;
    if (source === null || canvas === null || source.videoWidth === 0) return;
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
    setFrozen(true);
  }, []);

  const freezeAndPause = useCallback(() => {
    if (camera.state() === "live") {
      freeze();
      camera.pause();
    }
  }, [camera, freeze]);

  // -------------------------------------------------------------------------------------- data wait
  useEffect(() => {
    if (dataState.status === "loading") return;
    const data = dataState.status === "ready" ? dataState.data : null;
    for (const resolve of dataWaiters.current) resolve(data);
    dataWaiters.current = [];
  }, [dataState]);

  const waitForData = (): Promise<StrainData | null> => {
    const current = dataRef.current;
    if (current.status === "ready") return Promise.resolve(current.data);
    if (current.status === "error") return Promise.resolve(null);
    return new Promise((resolve) => dataWaiters.current.push(resolve));
  };

  // ----------------------------------------------------------------------------------------- boot
  useEffect(() => {
    if (!active || phase.name !== "idle") return;
    let cancelled = false;
    void (async () => {
      const supported = camera.isSupported();
      const permission = supported ? await camera.permission() : "unknown";
      if (cancelled) return;
      dispatch({
        type: "boot",
        supported,
        permission,
        introSeen: deps.store.getItem(INTRO_SEEN_KEY) !== null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [active, phase.name, camera, deps.store, dispatch]);

  // ------------------------------------------------------------------------------- camera starting
  useEffect(() => {
    if (phase.name !== "starting" || !active || !visible) return;
    const target = video.current;
    if (target === null) return;
    let cancelled = false;
    const hintTimer = setTimeout(() => {
      setStartingHint(true);
      announce(SCAN_COPY.announceStarting);
    }, timing.startingHintMs);
    const started = deps.now();
    mark("camera:request");
    void (async () => {
      try {
        if (camera.state() === "paused") {
          try {
            await camera.resume();
          } catch {
            await camera.start(target);
          }
        } else if (camera.state() === "stopped") {
          await camera.start(target);
        }
        if (cancelled) return;
        mark("camera:ready");
        perf.setState({ cameraReadyMs: Math.round(deps.now() - started) });
        setCaps(camera.capabilities());
        setFrozen(false);
        dispatch({ type: "ready" });
      } catch (error) {
        if (cancelled) return;
        dispatch({
          type: "fail",
          failure: error instanceof CameraError ? error.failure : "busy",
        });
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(hintTimer);
      setStartingHint(false);
    };
  }, [phase.name, active, visible, camera, deps, perf, timing, announce, dispatch]);

  // A live scanner whose camera went away (tab hidden and back, track ended) restarts.
  useEffect(() => {
    if (phase.name === "live" && active && visible && camera.state() !== "live") {
      dispatch({ type: "request" });
    }
  }, [phase.name, active, visible, camera, dispatch]);

  useEffect(
    () =>
      camera.onEnded(() => {
        setTorchOn(false);
        if (phaseNow().name === "live") dispatch({ type: "request" });
      }),
    [camera, dispatch, phaseNow],
  );

  // Hidden tab: release the camera (battery, and the indicator light goes off). Back: restart.
  useEffect(() => {
    if (visible) return;
    camera.stop();
    setTorchOn(false);
  }, [visible, camera]);

  // Covered by the result view (inactive), a sheet, or a read: pause; release after a while.
  const running = active && visible && (phase.name === "starting" || phase.name === "live");
  useEffect(() => {
    if (running || phase.name === "idle") return;
    if (!active || isSheet(phase) || phase.name === "result") freezeAndPause();
    const release = setTimeout(() => {
      if (camera.state() === "paused") {
        camera.stop();
        setTorchOn(false);
      }
    }, timing.releaseMs);
    return () => clearTimeout(release);
  }, [running, active, phase, camera, freezeAndPause, timing.releaseMs]);

  // Leaving the scanner: release everything, and forget a barcode that was waiting to be learned.
  useEffect(
    () => () => {
      clearTimeout(lockTimer.current);
      readAbort.current?.abort();
      readAbort.current = null;
      camera.stop();
      session.getState().set({ aim: false, pendingBarcode: null });
      session.getState().dispatch({ type: "reset" });
    },
    [camera, session],
  );

  // Back from the result view (Scan another, close, Escape, browser back): "ready" breath, focus the
  // shutter, and mute the code that opened it (D6).
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      const name = phaseNow().name;
      if (name === "result" || name === "locked") {
        focusShutterOnLive.current = true;
        session.getState().set({
          readyBreath: session.getState().readyBreath + 1,
          pendingBarcode: null,
        });
        dispatch({ type: "close" });
        announce(SCAN_COPY.announceReady);
      }
    }
    wasActive.current = active;
  }, [active, announce, dispatch, phaseNow, session]);

  useEffect(() => {
    if (phase.name === "live" && focusShutterOnLive.current) {
      focusShutterOnLive.current = false;
      shutter.current?.focus({ preventScroll: true });
    }
  }, [phase.name]);

  // ------------------------------------------------------------------------------- sheet history
  const sheetOpen = isSheet(phase);
  useEffect(() => {
    if (!sheetOpen) return;
    if (!currentNavState().sheet) {
      window.history.pushState({ ...currentNavState(), sheet: true }, "", window.location.href);
    }
    const onPop = () => {
      if (currentNavState().sheet || !isSheet(phaseNow())) return;
      const intent = closeIntent.current;
      closeIntent.current = "close";
      const state = session.getState();
      if (intent === "close") state.set({ pendingBarcode: null, aim: false });
      else state.set({ aim: true, shutterPulse: state.shutterPulse + 1 });
      focusShutterOnLive.current = true;
      dispatch({ type: "close" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [sheetOpen, dispatch, phaseNow, session]);

  const closeSheet = (intent: CloseIntent = "close") => {
    closeIntent.current = intent;
    if (currentNavState().sheet) window.history.back();
    else window.dispatchEvent(new PopStateEvent("popstate"));
  };

  /** Leaves the scanner for search, replacing a sheet's history entry so back returns to the camera. */
  const goSearch = (query?: string) => {
    readAbort.current?.abort();
    readAbort.current = null;
    session.getState().set({ pendingBarcode: null, aim: false });
    const fromSheet = currentNavState().sheet === true;
    const depth = (currentNavState().depth ?? 0) + 1;
    navigate(searchPath(query), { replace: fromSheet, state: { depth } });
  };

  // --------------------------------------------------------------------------------- outcomes
  const openResult = useCallback(
    (strainId: string, learned = false) => {
      dispatch({ type: "open-result", strainId });
      const nav = currentNavState();
      navigate(strainPath(strainId), {
        replace: nav.sheet === true,
        state: {
          depth: (nav.depth ?? 0) + 1,
          fromScan: true,
          flood: floodOrigin.current,
          ...(learned ? { learned: true } : {}),
        },
      });
    },
    [dispatch],
  );

  /** Teaches barcode memory after a confirmed strain (P13). True when it's recognized from now on. */
  const learn = useCallback(
    async (pending: PendingBarcode | null, strainId: string): Promise<boolean> => {
      if (pending === null) return false;
      const facts = deps.classifier.classifyBarcode(pending.value, pending.format);
      const existing = await recallBarcode(deps.memory, pending.value, pending.format);
      const next = learnedMemory(existing, {
        barcode: pending.value,
        format: pending.format,
        strainId,
        now: deps.clock(),
        tracking: facts.kind === "tracking",
      });
      if (next === null) return false;
      try {
        await deps.memory.put(next);
      } catch {
        return false;
      }
      return next.learnable;
    },
    [deps],
  );

  // waitForData reads refs only.
  const showOutcome = useCallback(
    async (
      candidates: LabelReading["candidates"],
      pending: PendingBarcode | null,
      packageSays?: PackageSays | null,
    ) => {
      const data = await waitForData();
      if (data === null) {
        dispatch({ type: "read-failed", reason: "failed" });
        return;
      }
      const started = deps.now();
      const outcome = outcomeFor(data.index, candidates, packageSays);
      perf.setState({ decideMs: Math.round((deps.now() - started) * 10) / 10 });
      mark("decide:end");
      if (outcome.kind === "accept") {
        const learned = await learn(pending, outcome.strainId);
        session.getState().set({ pendingBarcode: null });
        openResult(outcome.strainId, learned);
        return;
      }
      if (outcome.kind === "package-says") {
        session.getState().set({ pendingBarcode: null });
        dispatch({ type: "open-result", strainId: PACKAGE_RESULT_ID });
        const nav = currentNavState();
        navigate(strainPath(PACKAGE_RESULT_ID), {
          replace: nav.sheet === true,
          state: {
            depth: (nav.depth ?? 0) + 1,
            fromScan: true,
            flood: floodOrigin.current,
            packageResult: { label: outcome.packageSays, name: outcome.read },
          },
        });
        return;
      }
      dispatch({ type: "decided", outcome });
      announce(
        outcome.kind === "choose"
          ? outcome.cross
            ? `Cross of two strains. ${outcome.candidates.length} parents shown`
            : `${outcome.candidates.length} possible matches`
          : outcome.read === ""
            ? "No text found"
            : "No match found",
      );
    },
    [announce, deps, dispatch, learn, openResult, perf, session],
  );

  const openCodeSheet = (sheet: CodeSheetModel) => {
    dispatch({ type: "open-code", sheet });
    announce("Barcode not recognized");
  };

  const act = (action: CodeAction) => {
    if (phaseNow().name !== "locked") return;
    switch (action.kind) {
      case "deep-link":
      case "remembered":
        openResult(action.strainId);
        return;
      case "qr-candidates":
        void showOutcome(action.candidates, null);
        return;
      case "unknown-barcode":
        session.getState().set({
          pendingBarcode: action.learnable ? { value: action.value, format: action.format } : null,
        });
        openCodeSheet({
          kind: "unknown-barcode",
          value: action.value,
          format: action.format,
          learnable: action.learnable,
        });
        return;
      case "tracking":
        openCodeSheet({ kind: "tracking", value: action.value });
        return;
      case "coa":
      case "traceability":
        openCodeSheet({ kind: action.kind, url: action.url });
        return;
    }
  };

  // ------------------------------------------------------------------------------ live detection
  const onStable = async (codes: readonly DetectedCode[], meta: StableMeta): Promise<boolean> => {
    const pending = classifyCodes(codes, deps.classifier);
    if (pending.length === 0) return false;
    const resolved = await resolveCodes(pending, deps.memory);
    let winner = pickCode(resolved);
    if (winner === null) return false;
    if (phaseNow().name !== "live") return true;
    // A Code 128 confirmed once and seen again on a separate scan becomes learnable (P13).
    if (winner.action.kind === "unknown-barcode" && winner.action.candidate !== null) {
      const seen = sightedMemory(winner.action.candidate);
      try {
        await deps.memory.put(seen);
      } catch {
        // Storage unavailable: carry on as unknown.
      }
      if (seen.learnable) {
        winner = {
          code: winner.code,
          action: { kind: "remembered", strainId: seen.strain_id, memory: seen },
        };
      }
    }
    if (phaseNow().name !== "live") return true;
    const key = codeKey(winner.code);
    const sinceSeen = meta.sinceFirstSeen(key);
    perf.setState({ detectMs: sinceSeen === null ? null : Math.round(sinceSeen) });
    mark("detect:accept");

    // Non-matching codes (unknown barcodes, tracking tags, COA/traceability URLs) never block
    // the camera with a dead-end sheet: remember learnable barcodes silently, pulse the shutter,
    // and let the user keep aiming at the strain name (D22).
    if (
      winner.action.kind === "unknown-barcode" ||
      winner.action.kind === "tracking" ||
      winner.action.kind === "coa" ||
      winner.action.kind === "traceability"
    ) {
      const state = session.getState();
      state.cooldown.mute(key, deps.now());
      state.set({
        pendingBarcode:
          winner.action.kind === "unknown-barcode" && winner.action.learnable
            ? { value: winner.action.value, format: winner.action.format }
            : state.pendingBarcode,
        aim: true,
        shutterPulse: state.shutterPulse + 1,
      });
      deps.haptics.tick();
      announce(SCAN_COPY.aimHint);
      return false;
    }

    const isQr = winner.code.format === "qr_code";
    const rect = boxOnScreen(winner.code);
    freezeAndPause();
    floodOrigin.current = fractionOf(rect, rootRect());
    session.getState().set({
      lastCodeKey: key,
      // A different code than the one waiting to be learned: the user moved on.
      pendingBarcode: null,
      aim: false,
    });
    dispatch({ type: "lock", target: { rect, isQr } });
    deps.haptics.tick();
    announce(isQr ? SCAN_COPY.qrFound : SCAN_COPY.barcodeFound);
    const action = winner.action;
    lockTimer.current = setTimeout(
      () => act(action),
      prefersReducedMotion() ? Math.min(120, timing.lockMs) : timing.lockMs,
    );
    return true;
  };
  const onStableRef = useRef(onStable);
  onStableRef.current = onStable;

  useEffect(() => {
    if (phase.name !== "live" || !active || !visible) return;
    deps.prefetchOcr?.();
    const controller = new AbortController();
    const detector = deps.detector();
    detector.ready().then(
      (engine) => perf.setState({ engine }),
      () => {},
    );
    const state = session.getState();
    const now = deps.now();
    state.cooldown.resume(now);
    if (state.lastCodeKey !== null) {
      state.cooldown.mute(state.lastCodeKey, now);
      state.set({ lastCodeKey: null });
    }
    const fps = new FpsMeter();
    const coach = new LightCoach();
    void runDetectionLoop(
      {
        camera,
        detector,
        cooldown: state.cooldown,
        now: deps.now,
        region: detectRegion,
        fps: timing.fps,
        onFrame: (stats) => {
          const at = deps.now();
          perf.setState({
            engine: stats.engine,
            decodeMs: Math.round(stats.decodeMs),
            roundTripMs: Math.round(stats.roundTripMs),
            fps: fps.tick(at),
            ...(stats.luma === null ? {} : { luma: Math.round(stats.luma) }),
          });
          setDarkFrame(coach.observe(stats.luma, at));
        },
        onStable: (codes, meta) => onStableRef.current(codes, meta),
      },
      controller.signal,
    );
    return () => {
      controller.abort();
      setDarkFrame(false);
    };
  }, [phase.name, active, visible, camera, deps, detectRegion, perf, session, timing.fps]);

  // ------------------------------------------------------------------------------------- shutter
  const onShutter = async () => {
    if (phaseNow().name !== "live") return;
    const button = shutter.current?.getBoundingClientRect() ?? null;
    floodOrigin.current = fractionOf(
      button === null
        ? null
        : {
            left: button.left - (rootRect()?.left ?? 0),
            top: button.top - (rootRect()?.top ?? 0),
            width: button.width,
            height: button.height,
          },
      rootRect(),
    );
    freeze();
    setFlash((n) => n + 1);
    setKeepWaiting(false);
    dispatch({ type: "shutter" });
    announce(SCAN_COPY.announceReading);
    const started = deps.now();
    let grabbed: Awaited<ReturnType<typeof camera.grabFrame>>;
    try {
      grabbed = await camera.grabFrame({ region: ocrRegion() });
    } catch {
      camera.pause();
      dispatch({ type: "captured" });
      dispatch({ type: "read-failed", reason: "failed" });
      return;
    }
    camera.pause();
    perf.setState({
      lastCrop: {
        width: Math.round(grabbed.region.width),
        height: Math.round(grabbed.region.height),
      },
    });
    dispatch({ type: "captured" });
    const pending = session.getState().pendingBarcode;
    session.getState().set({ aim: false });

    const controller = new AbortController();
    readAbort.current = controller;
    const fail = (reason: ReadLabelError["kind"]) => {
      if (readAbort.current !== controller) return;
      readAbort.current = null;
      controller.abort();
      setDownload(null);
      dispatch({ type: "read-failed", reason });
      announce(reason === "failed" ? "Couldn't read the label" : "Text reading isn't available");
    };
    const timers = [
      setTimeout(() => {
        dispatch({ type: "slow", stage: "still" });
        announce(SCAN_COPY.announceStill);
      }, timing.stillMs),
      setTimeout(() => {
        dispatch({ type: "slow", stage: "long" });
        announce(SCAN_COPY.announceLong);
      }, timing.longMs),
      setTimeout(() => fail("failed"), timing.failMs),
    ];
    mark("ocr:start");
    let reading: LabelReading | null = null;
    try {
      reading = await deps.readLabel(grabbed.frame, {
        signal: controller.signal,
        onDownload: (progress) => setDownload(progress),
      });
    } catch (error) {
      fail(error instanceof ReadLabelError ? error.kind : "failed");
    } finally {
      for (const timer of timers) clearTimeout(timer);
    }
    if (reading === null || readAbort.current !== controller) return;
    readAbort.current = null;
    setDownload(null);
    mark("ocr:end");
    perf.setState({ readMs: Math.round(deps.now() - started) });
    await showOutcome(reading.candidates, pending, reading.packageSays);
  };

  const searchInstead = () => goSearch();

  // ----------------------------------------------------------------------------------- camera off
  const onTryAgain = async () => {
    const current = phaseNow();
    if (current.name !== "off") return;
    if (current.failure === "denied") {
      // Never re-prompt on our own: check the setting first (docs/design/flows.md §5).
      const permission = await camera.permission();
      if (permission === "denied") {
        dispatch({ type: "still-off" });
        return;
      }
    }
    dispatch({ type: "request" });
  };

  const markIntroSeen = () => deps.store.setItem(INTRO_SEEN_KEY, deps.clock().toISOString());

  const toggleTorch = async () => {
    const next = !torchOn;
    try {
      await camera.setTorch(next);
      setTorchOn(next);
    } catch {
      setCaps({ torch: false });
      setTorchOn(false);
    }
  };

  // ----------------------------------------------------------------------------------------- view
  if (phase.name === "priming") {
    return (
      <CameraCard
        onContinue={() => {
          markIntroSeen();
          dispatch({ type: "request" });
        }}
        onTypeInstead={() => {
          markIntroSeen();
          navigate(SEARCH_PATH, { state: { depth: nextDepth() ?? 1 } });
        }}
      />
    );
  }

  const off = phase.name === "off" ? phase : null;
  const locked = phase.name === "locked" ? phase.target : null;
  const processing = phase.name === "processing" ? phase : null;
  const showTorch =
    caps.torch && (phase.name === "live" || phase.name === "locked" || processing !== null);

  let hint: string | null = aim ? SCAN_COPY.aimHint : SCAN_COPY.hint;
  if (phase.name === "starting") hint = startingHint ? SCAN_COPY.starting : null;
  if (phase.name === "start") hint = null;
  if (phase.name === "live" && darkFrame && !aim) {
    hint = caps.torch ? SCAN_COPY.moreLightTorch : SCAN_COPY.moreLight;
  }
  if (locked !== null) hint = locked.isQr ? SCAN_COPY.qrFound : SCAN_COPY.barcodeFound;
  if (phase.name === "capturing") hint = SCAN_COPY.reading;
  if (processing !== null) {
    hint =
      processing.stage === "reading"
        ? SCAN_COPY.reading
        : processing.stage === "still"
          ? SCAN_COPY.stillReading
          : SCAN_COPY.takingLong;
  }
  const longWait = processing?.stage === "long" && !keepWaiting;

  return (
    <main
      ref={root}
      aria-label={SCAN_COPY.screenLabel}
      aria-hidden={active ? undefined : true}
      inert={!active}
      className="scanner fixed inset-0 overflow-hidden bg-black text-white"
      data-phase={phase.name}
      data-testid="scanner"
    >
      <video
        ref={video}
        className="absolute inset-0 size-full object-cover"
        muted
        playsInline
        autoPlay
        data-testid="viewport"
        hidden={off !== null}
      />
      <canvas
        ref={freezeCanvas}
        className="scan-freeze absolute inset-0 size-full object-cover"
        hidden={!frozen || off !== null}
        data-testid="frozen-frame"
      />
      {flash > 0 && <div key={flash} aria-hidden="true" className="scan-flash" />}

      {off !== null ? (
        <CameraOffPanel
          failure={off.failure}
          stillOff={off.stillOff}
          userAgent={deps.userAgent}
          standalone={deps.standalone}
          onTryAgain={() => void onTryAgain()}
          onCopyLink={() => deps.copyText(`${window.location.origin}/`)}
        />
      ) : (
        <>
          <div className="scan-topbar">
            <span className="display text-[1.25rem] tracking-[0.01em]">FlowerScan</span>
            {showTorch && (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                aria-pressed={torchOn}
                aria-label={torchOn ? SCAN_COPY.torchOff : SCAN_COPY.torchOn}
                className="scan-torch pressable grid size-12 place-items-center rounded-full"
                data-testid="torch"
              >
                <ScanIcon name="torch" />
              </button>
            )}
          </div>

          <Reticle
            ref={reticle}
            lock={locked?.rect ?? null}
            rootRect={rootRect}
            breath={readyBreath}
            shimmer={
              phase.name === "capturing" || (processing !== null && processing.stage !== "long")
            }
            hint={
              download !== null ? (
                <div className="scan-hint scan-hint-box min-w-[260px]">
                  {SCAN_COPY.downloading(deps.ocrDownloadLabel ?? "a few MB")}
                  <div
                    className="scan-progress"
                    role="progressbar"
                    aria-label={SCAN_COPY.downloadLabel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={
                      download.total > 0 ? Math.round((download.loaded / download.total) * 100) : 0
                    }
                  >
                    <b
                      style={{
                        transform: `scaleX(${download.total > 0 ? download.loaded / download.total : 0})`,
                      }}
                    />
                  </div>
                </div>
              ) : hint === null ? null : (
                <div className={`scan-hint ${longWait ? "scan-hint-box" : ""}`} data-testid="hint">
                  {hint}
                  {longWait && (
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setKeepWaiting(true)}
                        className="scan-pill-button border border-(--color-border-strong) bg-(--color-surface-2) text-(--color-text)"
                      >
                        {SCAN_COPY.keepWaiting}
                      </button>
                      <button
                        type="button"
                        onClick={searchInstead}
                        className="scan-pill-button bg-(--color-accent) text-(--color-on-accent)"
                      >
                        {SCAN_COPY.searchInstead}
                      </button>
                    </div>
                  )}
                </div>
              )
            }
          />

          {phase.name === "start" && (
            <div className="scan-center-cta">
              <button
                type="button"
                onClick={() => dispatch({ type: "request" })}
                className="pressable inline-flex min-h-[52px] items-center gap-2 rounded-(--radius-md) bg-(--color-accent) px-5 font-semibold text-(--color-on-accent)"
              >
                <ScanIcon name="camera" size={20} />
                {SCAN_COPY.startCamera}
              </button>
              <p className="mt-3 text-footnote text-(--color-text-2)">
                {SCAN_COPY.startCameraNote}
              </p>
            </div>
          )}

          <div className="scan-bottom">
            <div className="scan-controls">
              <Link
                href={SEARCH_PATH}
                className="scan-side"
                onClick={() => {
                  readAbort.current?.abort();
                  readAbort.current = null;
                }}
              >
                <span className="scan-disc">
                  <Icon name="search" />
                </span>
                {SCAN_COPY.search}
              </Link>
              <button
                ref={shutter}
                key={`shutter-${shutterPulse}`}
                type="button"
                aria-label={SCAN_COPY.shutter}
                onClick={() => void onShutter()}
                className="scan-shutter"
                data-pulse={shutterPulse > 0 ? "" : undefined}
                data-pressed={phase.name === "capturing" || processing !== null ? "" : undefined}
                data-testid="shutter"
              />
              {/* Recent (last 5 journal entries) arrives with the journal (T-015); empty slot keeps the row balanced. */}
              <span aria-hidden="true" />
            </div>
          </div>
        </>
      )}

      {phase.name === "code" && (
        <CodeSheet
          sheet={phase.sheet}
          onClose={() => closeSheet("close")}
          onScanLabel={() => closeSheet("scan-label")}
          onSearch={() => goSearch()}
          onOpenLink={(url) => deps.openUrl(url)}
        />
      )}
      {phase.name === "choose" && dataState.status === "ready" && (
        <ChooseSheet
          read={phase.outcome.read}
          candidates={phase.outcome.candidates}
          cross={phase.outcome.cross}
          data={dataState.data}
          remembering={pendingBarcode !== null}
          onPick={(id) => {
            if (phase.outcome.cross) {
              // A parent of an unknown cross: its strain page, never a scan result, nothing learned (P4).
              session.getState().set({ pendingBarcode: null });
              navigate(strainPath(id), {
                replace: currentNavState().sheet === true,
                state: { depth: (currentNavState().depth ?? 0) + 1 },
              });
              return;
            }
            const waiting = session.getState().pendingBarcode;
            void learn(waiting, id).then((learned) => {
              session.getState().set({ pendingBarcode: null });
              openResult(id, learned);
            });
          }}
          onNone={() =>
            dispatch({ type: "decided", outcome: { kind: "none", read: phase.outcome.read } })
          }
          onClose={() => closeSheet("close")}
        />
      )}
      {phase.name === "none" && (
        <NoMatchSheet
          key={phase.outcome.read}
          read={phase.outcome.read}
          onSearch={(text) => goSearch(text)}
          onTryAgain={() => closeSheet("try-again")}
          onClose={() => closeSheet("close")}
        />
      )}
      {phase.name === "failed" && (
        <ReadErrorSheet
          reason={phase.reason}
          onTryAgain={() => closeSheet("try-again")}
          onSearch={() => goSearch()}
          onClose={() => closeSheet("close")}
        />
      )}

      {debug && <DebugOverlay perf={perf} />}
    </main>
  );
}
