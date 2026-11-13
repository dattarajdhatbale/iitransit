import { describe, expect, it } from "vitest";
import { SCENES, type SceneKey } from "../scenes/sceneGeometry";
import { CAPTIONS } from "./captions";
import {
  PHASES,
  TIMELINE_LENGTH,
  buildIntroTimeline,
  carTransform,
  computeFrame,
  seatPoint,
  studentStartPoints,
  timeForFraction,
  type IntroFrame,
} from "./introTimeline";
import { createRouteSampler } from "./routeSampler";

function setup(key: SceneKey) {
  const geometry = SCENES[key];
  const sampler = createRouteSampler(geometry.route);
  const intro = buildIntroTimeline(geometry, sampler, CAPTIONS);
  const frameAt = (units: number): IntroFrame => {
    intro.timeline.progress(units / TIMELINE_LENGTH);
    return computeFrame(intro.state, geometry, sampler);
  };
  return { geometry, sampler, intro, frameAt };
}

const KEYS: SceneKey[] = ["desktop", "mobile"];
const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let t = from; t <= to + 1e-9; t += step) out.push(Number(t.toFixed(4)));
  return out;
};

describe.each(KEYS)("%s timeline", (key: SceneKey) => {
  it("is exactly 100 units long", () => {
    expect(setup(key).intro.timeline.duration()).toBe(TIMELINE_LENGTH);
  });

  it("starts with the empty car parked level at the pickup point and the students at their start spots", () => {
    const { geometry, sampler, frameAt } = setup(key);
    const f = frameAt(0);
    const pickup = sampler.atFraction(geometry.pickupFraction);
    expect(f.car.x).toBeCloseTo(pickup.x, 6);
    expect(f.car.y).toBeCloseTo(pickup.y, 6);
    expect(f.car.tilt).toBe(0);
    expect(f.car.flip).toBe(geometry.startFacing);
    expect(f.passengers).toEqual([0, 0, 0]);
    expect(f.students.map((s) => s.opacity)).toEqual([1, 1, 1]);
    expect(f.students.every((s) => s.legsA)).toBe(true);
    studentStartPoints(geometry, pickup).forEach((start, n) => {
      expect(f.students[n].x).toBeCloseTo(start.x, 6);
      expect(f.students[n].y).toBeCloseTo(start.y, 6);
    });
    expect(f.dots).toBe(0);
    expect(f.hint).toBe(1);
    expect(f.captions).toEqual([1, 0, 0, 0]);
  });

  it("ends on exactly the approved final frame", () => {
    const { geometry, frameAt } = setup(key);
    const f = frameAt(TIMELINE_LENGTH);
    expect(Math.abs(f.car.x - geometry.stopAxle.x)).toBeLessThan(1);
    expect(Math.abs(f.car.y - geometry.stopAxle.y)).toBeLessThan(1);
    expect(f.car.tilt).toBe(0);
    expect(f.car.flip).toBe(1); // both final frames show the car facing right
    expect(f.car.transform).not.toContain("rotate");
    expect(f.passengers).toEqual([1, 1, 1]);
    expect(f.students.map((s) => s.opacity)).toEqual([0, 0, 0]);
    expect(f.hint).toBe(0);
    expect(f.captions).toEqual([0, 0, 0, 1]);
  });

  it("draws the full dotted line by the end", () => {
    const { sampler, frameAt } = setup(key);
    expect(frameAt(PHASES.dotsToPin[1]).dots).toBeCloseTo(sampler.length, 6);
    expect(frameAt(TIMELINE_LENGTH).dots).toBeCloseTo(sampler.length, 6);
  });

  it("never lets the dotted line run ahead of the car while it drives", () => {
    const { intro } = setup(key);
    // The dots and the car share the same window and ease, so the drawn length equals the car's distance.
    for (const t of range(PHASES.drive[0], PHASES.drive[1], 0.25)) {
      intro.timeline.progress(t / TIMELINE_LENGTH);
      // GSAP rounds tweened values to ~6 decimals, so compare to 0.001 scene units (~1/1000 px).
      expect(Math.abs(intro.state.dots - intro.state.distance)).toBeLessThan(1e-3);
    }
  });

  it("keeps the tilt within ±6° at every moment", () => {
    const { frameAt } = setup(key);
    for (const t of range(0, TIMELINE_LENGTH, 0.25)) {
      expect(Math.abs(frameAt(t).car.tilt)).toBeLessThanOrEqual(6 + 1e-9);
    }
  });

  it("never shows a student standing and seated at the same time", () => {
    const { frameAt } = setup(key);
    for (const t of range(0, TIMELINE_LENGTH, 0.1)) {
      const f = frameAt(t);
      for (let n = 0; n < 3; n++) {
        expect(Math.min(f.students[n].opacity, f.passengers[n])).toBeLessThan(0.75);
      }
    }
  });

  it("shows at most two captions at once, and only while they cross-fade", () => {
    const { frameAt } = setup(key);
    for (const t of range(0, TIMELINE_LENGTH, 0.1)) {
      const visible = frameAt(t).captions.filter((o) => o > 0.001);
      expect(visible.length).toBeLessThanOrEqual(2);
    }
    expect(frameAt(10).captions).toEqual([1, 0, 0, 0]);
    expect(frameAt(28).captions).toEqual([0, 1, 0, 0]);
    expect(frameAt(60).captions).toEqual([0, 0, 1, 0]);
    expect(frameAt(95).captions).toEqual([0, 0, 0, 1]);
  });

  it("alternates the legs while each student walks, and stands in pose A otherwise", () => {
    const { frameAt, intro } = setup(key);
    for (let n = 0; n < 3; n++) {
      const [start, end] = intro.schedule[n].walk;
      const poses = range(start + 0.5, end - 0.5, 1).map((t) => frameAt(t).students[n].legsA);
      expect(poses.some((p) => p)).toBe(true);
      expect(poses.some((p) => !p)).toBe(true);
      expect(frameAt(end + 0.5).students[n].legsA).toBe(true);
    }
  });

  it("walks every student to their spot beside the waiting car", () => {
    const { geometry, sampler, frameAt, intro } = setup(key);
    const pickup = sampler.atFraction(geometry.pickupFraction);
    const f = frameAt(Math.max(...intro.schedule.map((s) => s.walk[1])));
    for (let n = 0; n < 3; n++) {
      const seat = seatPoint(geometry, pickup, n);
      expect(f.students[n].x).toBeCloseTo(seat.x, 3);
      expect(f.students[n].y).toBeCloseTo(seat.y, 3);
    }
  });

  it("uses the scene's three starting spots, in the same left-to-right order as the stops by the car", () => {
    const { geometry, sampler } = setup(key);
    const pickup = sampler.atFraction(geometry.pickupFraction);
    const starts = studentStartPoints(geometry, pickup);
    expect([...starts].sort((a, b) => a.x - b.x)).toEqual([...geometry.studentStarts].sort((a, b) => a.x - b.x));
    const order = (xs: number[]) => [0, 1, 2].sort((a, b) => xs[a] - xs[b]);
    expect(order(starts.map((p) => p.x))).toEqual(order([0, 1, 2].map((n) => seatPoint(geometry, pickup, n).x)));
  });

  it("keeps the walking students apart (no bunching into one blob)", () => {
    const { frameAt, geometry } = setup(key);
    // Students are about 30 car units wide; keep their feet at least 35 car units apart while two are visible.
    const minGap = 35 * geometry.carScale;
    for (const t of range(0, 30, 0.1)) {
      const f = frameAt(t);
      for (let a = 0; a < 3; a++) {
        for (let b = a + 1; b < 3; b++) {
          if (f.students[a].opacity > 0.5 && f.students[b].opacity > 0.5) {
            expect(Math.abs(f.students[a].x - f.students[b].x)).toBeGreaterThan(minGap);
          }
        }
      }
    }
  });

  it("finishes boarding before the dotted line starts, in the order the students arrive", () => {
    const { intro } = setup(key);
    const boards = intro.schedule.map((s) => s.board);
    expect(Math.max(...boards.map((b) => b[1]))).toBeLessThanOrEqual(PHASES.dotsToPickup[0]);
    const byArrival = [0, 1, 2].sort((a, b) => intro.schedule[a].walk[1] - intro.schedule[b].walk[1]);
    const byBoarding = [0, 1, 2].sort((a, b) => boards[a][0] - boards[b][0]);
    expect(byBoarding).toEqual(byArrival);
  });

  it("plays the same in reverse: scrubbing back gives the same frames as playing forward", () => {
    const forward = setup(key);
    const backward = setup(key);
    backward.intro.timeline.progress(1);
    for (const t of [97, 90, 70, 50, 37, 33, 29, 24.5, 21, 12, 3, 1, 0]) {
      expect(backward.frameAt(t)).toEqual(forward.frameAt(t));
    }
  });

  it("gives identical frames whichever way the playhead jumps", () => {
    const a = setup(key);
    const b = setup(key);
    a.frameAt(100);
    a.frameAt(5);
    b.frameAt(60);
    expect(a.frameAt(45)).toEqual(b.frameAt(45));
  });
});

describe("turning (mobile)", () => {
  it("turns once, mirroring the car from left-facing to right-facing around the bend", () => {
    const { intro, frameAt } = setup("mobile");
    expect(intro.turnTimes).toHaveLength(1);
    const turn = intro.turnTimes[0];
    expect(turn).toBeGreaterThan(PHASES.drive[0]);
    expect(turn).toBeLessThan(PHASES.drive[1]);
    expect(frameAt(turn - PHASES.flipLength).car.flip).toBe(-1);
    expect(frameAt(turn + PHASES.flipLength).car.flip).toBe(1);
    expect(Math.abs(frameAt(turn).car.flip)).toBeLessThan(0.2);
  });

  it("desktop never turns", () => {
    const { intro, frameAt } = setup("desktop");
    expect(intro.turnTimes).toEqual([]);
    for (const t of range(0, TIMELINE_LENGTH, 1)) expect(frameAt(t).car.flip).toBe(1);
  });

  it("the turn happens where the car is at the route's leftmost point", () => {
    const { intro, sampler } = setup("mobile");
    intro.timeline.progress(intro.turnTimes[0] / TIMELINE_LENGTH);
    const p = sampler.at(intro.state.distance);
    const leftmost = Math.min(...sampler.samples.slice(0, sampler.samples.length / 2).map((s) => s.x));
    expect(p.x - leftmost).toBeLessThan(1);
  });
});

describe("helpers", () => {
  it("timeForFraction inverts the drive ease", () => {
    expect(timeForFraction(0)).toBeCloseTo(PHASES.drive[0], 4);
    expect(timeForFraction(1)).toBeCloseTo(PHASES.drive[1], 4);
    expect(timeForFraction(0.5)).toBeCloseTo((PHASES.drive[0] + PHASES.drive[1]) / 2, 4);
  });

  it("carTransform matches the final frames' own transforms when level and facing right", () => {
    expect(carTransform(SCENES.desktop, 1320, 593.6, 0, 1)).toBe("translate(1320,593.6) scale(1.15,1.15) translate(-153,-134)");
    expect(carTransform(SCENES.mobile, 214, 497, -6, -1)).toBe("translate(214,497) rotate(-6) scale(-1.2,1.2) translate(-153,-134)");
  });
});
