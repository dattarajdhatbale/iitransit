import { useEffect, useRef, type RefObject } from "react";
import { ARM_EVENT, FINISH_EVENT, PLAY_EVENT } from "../useLandingMotion";

interface PlayHandlers {
  /** Set the starting state (the element is still below the screen, Motion ON). */
  onArm?: () => void;
  /** Its moment: the element has scrolled into view. */
  onPlay?: () => void;
  /** Jump to the final state (Motion turned off, or the page is rebuilding). */
  onFinish?: () => void;
}

// Lets a part with its own JavaScript (a counter, a shuffle) follow useLandingMotion's
// [data-play] element. Handlers can change on every render; the listeners are attached once.
export function usePlayEvents(ref: RefObject<HTMLElement | null>, handlers: PlayHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const arm = () => latest.current.onArm?.();
    const play = () => latest.current.onPlay?.();
    const finish = () => latest.current.onFinish?.();
    el.addEventListener(ARM_EVENT, arm);
    el.addEventListener(PLAY_EVENT, play);
    el.addEventListener(FINISH_EVENT, finish);
    return () => {
      el.removeEventListener(ARM_EVENT, arm);
      el.removeEventListener(PLAY_EVENT, play);
      el.removeEventListener(FINISH_EVENT, finish);
    };
  }, [ref]);
}
