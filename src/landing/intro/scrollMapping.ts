// Keeps the view still when the intro's pin is added, removed or resized.
//
// The pin adds scroll distance below the stage (`distance`, in px; 0 when Motion is OFF). When it is
// rebuilt (Motion toggled, phone rotated), every position after the stage shifts. This maps the old
// scroll position to the one that shows the same thing afterwards:
//   - above the intro: unchanged
//   - inside the pinned range: same story progress (OFF counts as the final frame, so turning Motion on
//     keeps the final frame on screen; turning it off returns to the top of the intro)
//   - below the intro: shifted by the change in pin distance

export interface PinMetrics {
  /** Scroll position where the stage reaches the top of the screen (px). */
  start: number;
  /** Extra scroll distance added by the pin (px); 0 when Motion is OFF. */
  distance: number;
}

const EDGE = 1; // px of tolerance for rounding

export function mapScroll(scrollY: number, before: PinMetrics, after: PinMetrics): number {
  if (scrollY < before.start - EDGE) return scrollY;

  if (scrollY <= before.start + before.distance + EDGE) {
    const progress = before.distance > 0 ? Math.min(Math.max((scrollY - before.start) / before.distance, 0), 1) : 1;
    return after.distance > 0 ? after.start + progress * after.distance : after.start;
  }

  return scrollY - before.distance + after.distance + (after.start - before.start);
}
