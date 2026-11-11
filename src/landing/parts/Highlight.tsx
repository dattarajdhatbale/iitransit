import type { ReactNode } from "react";

// Slightly different hand-drawn strokes, so repeated underlines do not look stamped.
const STROKES = [
  "M2 7 C 22 3, 48 2.5, 70 4.5 S 92 6.5, 98 3.5",
  "M2 6.5 C 25 3, 55 3.5, 98 5",
  "M2 5 C 30 2.5, 60 7, 98 4",
  "M2 6 C 28 2.5, 62 3, 98 5.5",
];

// The marigold/orange underline under one word of a heading. It draws in when its section fades in.
export function Highlight({ children, stroke = 0 }: { children: ReactNode; stroke?: number }) {
  return (
    <span className="lp-hl">
      {children}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d={STROKES[stroke % STROKES.length]} />
      </svg>
    </span>
  );
}
