// Writes intro frames to the live SVG and captions, and puts everything back exactly as it was.
//
// The scene components render the approved final frame. While the animation runs, this applier owns
// the attributes it changes; `restore()` returns each one to its original value, so turning Motion OFF
// (or leaving the page) always lands on the untouched final frame.

import type { IntroFrame } from "./introTimeline";

interface Saved {
  el: Element;
  attr: string;
  value: string | null;
}

export interface IntroApplier {
  apply(frame: IntroFrame): void;
  restore(): void;
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Intro animation: missing element ${selector}`);
  return el;
}

const opacityText = (value: number) => String(Math.round(value * 1000) / 1000);

export function createIntroApplier(stage: HTMLElement, svg: SVGSVGElement): IntroApplier {
  const vehicle = required<SVGGElement>(svg, "#vehicle");
  const studentsGroup = required<SVGGElement>(svg, "#students");
  const places = [1, 2, 3].map((n) => required<SVGGElement>(svg, `#stand-${n}-place`));
  const legsA = [1, 2, 3].map((n) => required<SVGGElement>(svg, `#stand-${n} .legs-a`));
  const legsB = [1, 2, 3].map((n) => required<SVGGElement>(svg, `#stand-${n} .legs-b`));
  const passengers = [1, 2, 3].map((n) => required<SVGGElement>(svg, `#passenger-${n}`));
  const dotsMask = required<SVGPathElement>(svg, "#route-dash-mask-path");
  const captions = Array.from(stage.querySelectorAll<HTMLElement>("[data-caption]"));
  const hint = stage.querySelector<HTMLElement>("[data-scroll-hint]");

  // Browser's own path length, so the dash mask lines up exactly with the drawn dots.
  const maskLength = dotsMask.getTotalLength();

  // Save everything this applier will touch.
  const saved: Saved[] = [];
  const saveAttr = (el: Element, attr: string) => saved.push({ el, attr, value: el.getAttribute(attr) });
  saveAttr(vehicle, "transform");
  places.forEach((el) => saveAttr(el, "transform"));
  saveAttr(dotsMask, "stroke-dasharray");
  [studentsGroup, ...legsA, ...legsB, ...passengers, ...captions, ...(hint ? [hint] : [])].forEach((el) =>
    saveAttr(el, "style"),
  );

  // Only write what changed, to keep each scroll frame cheap.
  const last = new Map<string, string>();
  const write = (key: string, value: string, set: () => void) => {
    if (last.get(key) === value) return;
    last.set(key, value);
    set();
  };
  const setStyle = (key: string, el: HTMLElement | SVGElement, prop: "opacity" | "visibility", value: string) =>
    write(key, value, () => el.style.setProperty(prop, value));

  return {
    apply(frame) {
      setStyle("students", studentsGroup, "opacity", "1");
      write("car", frame.car.transform, () => vehicle.setAttribute("transform", frame.car.transform));

      frame.students.forEach((student, n) => {
        write(`place${n}`, student.transform, () => places[n].setAttribute("transform", student.transform));
        setStyle(`stand${n}`, places[n], "opacity", opacityText(student.opacity));
        setStyle(`legsA${n}`, legsA[n], "opacity", student.legsA ? "1" : "0");
        setStyle(`legsB${n}`, legsB[n], "opacity", student.legsA ? "0" : "1");
      });

      frame.passengers.forEach((opacity, n) => setStyle(`passenger${n}`, passengers[n], "opacity", opacityText(opacity)));

      // Dots are measured along the sampled route; scale to the browser's measure of the same path.
      const routeLength = frame.dotsRouteLength;
      const drawn = routeLength > 0 ? (frame.dots / routeLength) * maskLength : 0;
      const dash = drawn >= maskLength - 0.01 ? `${maskLength + 50} 0` : `${Math.max(drawn, 0).toFixed(2)} ${maskLength + 50}`;
      write("dots", dash, () => dotsMask.setAttribute("stroke-dasharray", dash));

      frame.captions.forEach((opacity, i) => {
        const el = captions[i];
        if (!el) return;
        setStyle(`caption${i}`, el, "opacity", opacityText(opacity));
        setStyle(`captionVis${i}`, el, "visibility", opacity > 0.001 ? "visible" : "hidden");
      });

      if (hint) setStyle("hint", hint, "opacity", opacityText(frame.hint));
    },

    restore() {
      for (const { el, attr, value } of saved) {
        if (value === null) el.removeAttribute(attr);
        else el.setAttribute(attr, value);
      }
      last.clear();
    },
  };
}
