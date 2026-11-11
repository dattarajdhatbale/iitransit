import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SCENES, type SceneKey } from "../scenes/sceneGeometry";
import { CAPTIONS } from "./captions";
import { createIntroApplier } from "./domApplier";
import { buildIntroTimeline, computeFrame } from "./introTimeline";
import { createRouteSampler } from "./routeSampler";
import { mapScroll, type PinMetrics } from "./scrollMapping";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Pinned scroll length, as a multiple of the screen height. */
const PIN_LENGTH: Record<SceneKey, number> = { desktop: 2.5, mobile: 2 };
/** Seconds the scene takes to catch up with the scroll position (smooths wheel steps). */
const SCRUB_SECONDS = 0.6;

interface Options {
  stageRef: RefObject<HTMLElement | null>;
  scene: SceneKey;
  motionOn: boolean;
}

function progressAt(scrollY: number, start: number, end: number): number {
  if (end <= start) return 0;
  return Math.min(Math.max((scrollY - start) / (end - start), 0), 1);
}

function jumpTo(top: number) {
  if (Math.abs(top - window.scrollY) < 0.5) return;
  window.scrollTo({ top, left: window.scrollX, behavior: "instant" });
}

// Runs the scroll-driven intro on the stage. With Motion OFF it does nothing at all: the scene's own
// markup is the final frame. Rebuilds when the scene (rotation) or the Motion setting changes, and keeps
// the view still across every rebuild (see scrollMapping.ts).
export function useIntroAnimation({ stageRef, scene, motionOn }: Options) {
  const metrics = useRef<PinMetrics | null>(null);
  // Last scroll position, captured from scroll events. Removing a pin shortens the page, and the browser
  // clamps window.scrollY at once; the next scroll event only fires later, so this still holds the
  // position the visitor was actually looking at when a rebuild starts.
  const lastScrollY = useRef(typeof window === "undefined" ? 0 : window.scrollY);

  useEffect(() => {
    const onScroll = () => {
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;
      const before = metrics.current;
      const scrollY = lastScrollY.current;

      if (!motionOn) {
        const after: PinMetrics = { start: stage.getBoundingClientRect().top + window.scrollY, distance: 0 };
        metrics.current = after;
        if (before) jumpTo(mapScroll(scrollY, before, after));
        stage.dataset.intro = "off";
        return () => {
          delete stage.dataset.intro;
        };
      }

      const svg = stage.querySelector<SVGSVGElement>(`svg[data-scene="${scene}"]`);
      if (!svg) return;

      const geometry = SCENES[scene];
      const sampler = createRouteSampler(geometry.route);
      const intro = buildIntroTimeline(geometry, sampler, CAPTIONS);
      const applier = createIntroApplier(stage, svg);
      const draw = () => {
        applier.apply(computeFrame(intro.state, geometry, sampler));
        stage.dataset.introProgress = intro.timeline.progress().toFixed(3);
      };
      intro.timeline.eventCallback("onUpdate", draw);

      const trigger = ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * PIN_LENGTH[scene])}`,
        pin: true,
        scrub: SCRUB_SECONDS,
        animation: intro.timeline,
        // No invalidateOnRefresh: the tweens animate one shared state object, and invalidating would make
        // them re-record their start values from wherever the story currently is. The pin length is a
        // function, so it is recalculated on every refresh anyway.
        anticipatePin: 1,
        onRefresh: (self) => {
          metrics.current = { start: self.start, distance: self.end - self.start };
        },
      });
      trigger.refresh();

      const after: PinMetrics = { start: trigger.start, distance: trigger.end - trigger.start };
      metrics.current = after;
      if (before) {
        const target = mapScroll(scrollY, before, after);
        // trigger.scroll() moves the page and updates ScrollTrigger's own cached scroll position together.
        // A plain window.scrollTo leaves that cache stale until the next scroll event, and ScrollTrigger
        // would scrub the scene back towards the old position in the meantime.
        if (Math.abs(target - window.scrollY) >= 0.5) {
          trigger.scroll(target);
          jumpTo(target);
        }
      }

      // Show the frame for the current scroll position at once, without the scrub's catch-up animation
      // (otherwise a rebuild would visibly replay the story up to where the visitor already is).
      // Progress comes from the real scroll position: right after a programmatic scroll, the trigger's
      // own `progress` can still be stale.
      ScrollTrigger.update();
      trigger.getTween()?.progress(1);
      intro.timeline.progress(progressAt(window.scrollY, trigger.start, trigger.end));
      draw();
      stage.dataset.intro = "running";

      return () => {
        // Detach first: tearing the timeline down may render it once more, which must not undo the restore.
        intro.timeline.eventCallback("onUpdate", null);
        applier.restore();
        delete stage.dataset.intro;
        delete stage.dataset.introProgress;
      };
    },
    { dependencies: [scene, motionOn], scope: stageRef, revertOnUpdate: true },
  );
}
