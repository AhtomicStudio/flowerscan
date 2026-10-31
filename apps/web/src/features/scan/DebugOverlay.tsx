// `?debug=perf`: live stage timings on the device itself (test-plan gap 10), so iPhone numbers can be read
// without a Mac. Dev aid only: numbers, no frames, no text read from labels.
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type { PerfStats } from "./perf";

const ms = (value: number | null) => (value === null ? "–" : `${value} ms`);

export function DebugOverlay({ perf }: { perf: StoreApi<PerfStats> }) {
  const stats = useStore(perf);
  const rows: [string, string][] = [
    ["engine", stats.engine ?? "–"],
    ["camera ready", ms(stats.cameraReadyMs)],
    ["decode", ms(stats.decodeMs)],
    ["round trip", ms(stats.roundTripMs)],
    ["detect fps", stats.fps === null ? "–" : String(stats.fps)],
    ["seen → accept", ms(stats.detectMs)],
    ["crop", stats.lastCrop === null ? "–" : `${stats.lastCrop.width}×${stats.lastCrop.height}`],
    ["read", ms(stats.readMs)],
    ["decide", ms(stats.decideMs)],
    ["luma", stats.luma === null ? "–" : String(stats.luma)],
  ];
  return (
    <dl
      className="num pointer-events-none absolute top-[calc(env(safe-area-inset-top)+60px)] left-2 z-20 grid grid-cols-[auto_auto] gap-x-2 rounded-(--radius-sm) bg-black/70 px-2 py-1.5 font-mono text-[11px] text-white leading-[1.35]"
      data-testid="debug-overlay"
    >
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-white/70">{label}</dt>
          <dd className="m-0" data-stat={label}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
