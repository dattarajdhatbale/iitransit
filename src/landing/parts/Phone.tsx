import type { ReactNode } from "react";

export type PhoneTone =
  /** The opposite of the page theme: a dark app on the cream page, a light app at night. */
  | "invert"
  /** Always the app's light theme (used on the dark How it works band). */
  | "light";

interface PhoneProps {
  tone: PhoneTone;
  className?: string;
  /** Mock phones are decorative unless they hold something to interact with. */
  decorative?: boolean;
  children: ReactNode;
}

// A CSS phone frame. The screen's colours come from the tone class (see landing.css).
export function Phone({ tone, className = "", decorative = true, children }: PhoneProps) {
  return (
    <div className={`lp-phone lp-ui-${tone} ${className}`} aria-hidden={decorative || undefined}>
      {children}
    </div>
  );
}

export function StatusBar({ time }: { time: string }) {
  return (
    <div className="lp-statusbar">
      <span>{time}</span>
      <i>●●●&nbsp;▮</i>
    </div>
  );
}
