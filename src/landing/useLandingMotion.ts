import { useEffect, type RefObject } from "react";

/** Fired on a [data-play] element when its moment starts, for parts that run their own JavaScript. */
export const PLAY_EVENT = "lp:play";
/** Fired on every [data-play] element when Motion turns off, to jump straight to the final state. */
export const FINISH_EVENT = "lp:finish";

/** A section counts as "still to come" while its top is below this share of the screen height. */
const FOLD = 0.86;

// Runs every effect below the intro. With Motion ON, anything still below the screen is put in its
// starting state and plays once when it scrolls into view:
//   [data-reveal]  fades up (class lp-pre until then)
//   [data-play]    its own moment (lp-wait until then, lp-play from then on, plus a PLAY_EVENT)
// One element may carry both. Content already on screen or above it is never hidden, so a reload,
// Back or an anchor link never lands on blank space. With Motion OFF nothing is armed, and turning
// Motion off mid-way jumps everything to its final state.
//
// The hook only adds and removes its own classes, which React never sets, so re-renders (theme,
// Motion toggle) and these effects never overwrite each other.
export function useLandingMotion(rootRef: RefObject<HTMLElement | null>, motionOn: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.motion = motionOn ? "on" : "off";

    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const plays = Array.from(root.querySelectorAll<HTMLElement>("[data-play]"));

    if (!motionOn) {
      for (const el of reveals) el.classList.remove("lp-pre");
      for (const el of plays) {
        el.classList.remove("lp-wait", "lp-play");
        el.dispatchEvent(new CustomEvent(FINISH_EVENT));
      }
      return;
    }

    const stillToCome = (el: HTMLElement) => el.getBoundingClientRect().top > window.innerHeight * FOLD;

    const start = (el: HTMLElement) => {
      el.classList.remove("lp-pre");
      if (el.classList.contains("lp-wait")) {
        el.classList.remove("lp-wait");
        el.classList.add("lp-play");
        el.dispatchEvent(new CustomEvent(PLAY_EVENT));
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          start(entry.target as HTMLElement);
        }
      },
      { rootMargin: "0px 0px -14% 0px" },
    );

    const armed = new Set<HTMLElement>();
    for (const el of reveals) {
      if (!stillToCome(el)) continue;
      el.classList.add("lp-pre");
      armed.add(el);
    }
    for (const el of plays) {
      // Already played (it stays in its final state), or already on screen: leave it as it is.
      if (el.classList.contains("lp-play") || !stillToCome(el)) continue;
      el.classList.add("lp-wait");
      armed.add(el);
    }
    armed.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      // Leave nothing half-armed: a rebuild (Motion toggled, Strict Mode) starts from a clean page.
      for (const el of armed) el.classList.remove("lp-pre", "lp-wait");
    };
  }, [rootRef, motionOn]);
}
