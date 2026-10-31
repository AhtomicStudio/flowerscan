// The reticle: corners only, 80% width, 5:3 (docs/design/screens/scanner.md). On lock-on the four corners
// spring to the code's box (transform only, 180 ms), turn accent and pulse once. The hint pill sits under it.
import { type ReactNode, type Ref, useLayoutEffect, useRef, useState } from "react";
import type { Rect } from "./geometry";

const CORNERS = ["tl", "tr", "bl", "br"] as const;
type Corner = (typeof CORNERS)[number];

export interface ReticleProps {
  ref: Ref<HTMLDivElement>;
  /** The code's box, relative to the scanner root. Null → the corners stay on the reticle. */
  lock: Rect | null;
  rootRect: () => DOMRect | null;
  /** Bumped to replay the "ready" breath. */
  breath: number;
  shimmer: boolean;
  hint: ReactNode;
}

type Offsets = Record<Corner, { x: number; y: number }>;

export function Reticle({ ref, lock, rootRect, breath, shimmer, hint }: ReticleProps) {
  const box = useRef<HTMLDivElement>(null);
  const [offsets, setOffsets] = useState<Offsets | null>(null);

  useLayoutEffect(() => {
    if (lock === null) {
      setOffsets(null);
      return;
    }
    const outer = rootRect();
    const own = box.current?.getBoundingClientRect();
    if (outer === null || own === undefined || own.width === 0) {
      setOffsets(null);
      return;
    }
    const r = {
      left: own.left - outer.left,
      top: own.top - outer.top,
      w: own.width,
      h: own.height,
    };
    const right = lock.left + lock.width - (r.left + r.w);
    const bottom = lock.top + lock.height - (r.top + r.h);
    setOffsets({
      tl: { x: lock.left - r.left, y: lock.top - r.top },
      tr: { x: right, y: lock.top - r.top },
      bl: { x: lock.left - r.left, y: bottom },
      br: { x: right, y: bottom },
    });
  }, [lock, rootRect]);

  return (
    <div className="scan-frame">
      <div
        ref={(node) => {
          box.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref !== null && ref !== undefined) ref.current = node;
        }}
        key={`breath-${breath}`}
        className="scan-reticle"
        aria-hidden="true"
        data-locked={lock !== null ? "" : undefined}
        data-breath={breath > 0 ? "" : undefined}
        data-testid="reticle"
      >
        {CORNERS.map((corner) => (
          <i
            key={corner}
            className={`scan-corner scan-corner-${corner}`}
            style={
              offsets === null
                ? undefined
                : { transform: `translate(${offsets[corner].x}px, ${offsets[corner].y}px)` }
            }
          />
        ))}
        {shimmer && <div className="scan-shimmer" data-testid="shimmer" />}
      </div>
      <div className="scan-hint-slot">{hint}</div>
    </div>
  );
}
