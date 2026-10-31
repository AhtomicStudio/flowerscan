// Screen ↔ camera-frame geometry for a video shown with `object-fit: cover`. Pure, so the crops and the
// lock-on box are unit-tested.
import type { FrameRegion, FrameSize } from "../../platform/camera/camera-service";
import type { Box } from "../../platform/detectors/protocol";

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** How the frame maps onto the element: element px = frame px × scale + offset. */
export interface CoverMap {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export function coverMap(frame: FrameSize, element: { width: number; height: number }): CoverMap {
  const scale = Math.max(element.width / frame.width, element.height / frame.height);
  return {
    scale,
    offsetX: (element.width - frame.width * scale) / 2,
    offsetY: (element.height - frame.height * scale) / 2,
  };
}

function clampRegion(region: FrameRegion, frame: FrameSize): FrameRegion {
  const x = Math.max(0, Math.min(frame.width, region.x));
  const y = Math.max(0, Math.min(frame.height, region.y));
  const right = Math.max(x, Math.min(frame.width, region.x + region.width));
  const bottom = Math.max(y, Math.min(frame.height, region.y + region.height));
  return { x, y, width: right - x, height: bottom - y };
}

/** An element-relative rect → the frame region under it (clamped to the frame). */
export function elementToFrame(rect: Rect, map: CoverMap, frame: FrameSize): FrameRegion {
  return clampRegion(
    {
      x: (rect.left - map.offsetX) / map.scale,
      y: (rect.top - map.offsetY) / map.scale,
      width: rect.width / map.scale,
      height: rect.height / map.scale,
    },
    frame,
  );
}

/** A frame box → element-relative px. */
export function frameToElement(box: Box, map: CoverMap): Rect {
  return {
    left: box.x * map.scale + map.offsetX,
    top: box.y * map.scale + map.offsetY,
    width: box.width * map.scale,
    height: box.height * map.scale,
  };
}

/** The part of the frame the user can see (detection looks at all of it, not only the reticle). */
export function visibleRegion(frame: FrameSize, element: { width: number; height: number }) {
  return elementToFrame(
    { left: 0, top: 0, width: element.width, height: element.height },
    coverMap(frame, element),
    frame,
  );
}

/** The OCR crop margin around the reticle, per side, as a fraction of the reticle size (docs/06 §1). */
export const OCR_MARGIN = 0.1;

/** The reticle plus a 10% margin on each side, in frame px (the shutter's crop). */
export function reticleCrop(
  reticle: Rect,
  frame: FrameSize,
  element: { width: number; height: number },
  margin = OCR_MARGIN,
): FrameRegion {
  const grown: Rect = {
    left: reticle.left - reticle.width * margin,
    top: reticle.top - reticle.height * margin,
    width: reticle.width * (1 + 2 * margin),
    height: reticle.height * (1 + 2 * margin),
  };
  return elementToFrame(grown, coverMap(frame, element), frame);
}

/** A box inside a (possibly downscaled) grabbed bitmap → frame px. */
export function bitmapBoxToFrame(
  box: Box,
  region: FrameRegion,
  bitmap: { width: number; height: number },
): Box {
  const sx = bitmap.width > 0 ? region.width / bitmap.width : 1;
  const sy = bitmap.height > 0 ? region.height / bitmap.height : 1;
  return {
    x: region.x + box.x * sx,
    y: region.y + box.y * sy,
    width: box.width * sx,
    height: box.height * sy,
  };
}

/** Grow a rect by `pad` px on each side (the lock-on corners sit just outside the code). */
export function padRect(rect: Rect, pad: number): Rect {
  return {
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}
