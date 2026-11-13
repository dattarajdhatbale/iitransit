// Small inline icons for the landing page. All decorative (aria-hidden); the text beside them carries
// the meaning.

const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const ChevronDown = () => (
  <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const BellIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...base} aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} aria-hidden="true">
    <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
  </svg>
);

/** The map pin from the illustrations, in the art's own colour classes. */
export const ArtPin = ({ className = "" }: { className?: string }) => (
  <svg className={`it-art ${className}`} viewBox="0 0 34 44" aria-hidden="true">
    <path className="f-accent s-ink" d="M17 41s13-13.6 13-24A13 13 0 0 0 4 17c0 10.4 13 24 13 24z" strokeWidth="3" strokeLinejoin="round" />
    <circle className="f-wall s-ink" cx="17" cy="17" r="5" strokeWidth="3" />
  </svg>
);
