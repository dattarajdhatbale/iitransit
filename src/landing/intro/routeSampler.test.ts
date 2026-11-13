import { describe, expect, it } from "vitest";
import { SCENES } from "../scenes/sceneGeometry";
import { createRouteSampler, facingFor, normaliseAngle, parseRoute, tiltFor } from "./routeSampler";

const desktop = createRouteSampler(SCENES.desktop.route);
const mobile = createRouteSampler(SCENES.mobile.route);

// Reference values were measured independently from the art (Python, 4,000 steps per segment).
describe("route lengths", () => {
  it("desktop route is about 1231 units", () => {
    expect(desktop.length).toBeGreaterThan(1229);
    expect(desktop.length).toBeLessThan(1233);
  });
  it("mobile route is about 1276 units", () => {
    expect(mobile.length).toBeGreaterThan(1274);
    expect(mobile.length).toBeLessThan(1278);
  });
});

describe("key points match the approved frames", () => {
  it("desktop pickup is at about (718, 752)", () => {
    const p = desktop.atFraction(SCENES.desktop.pickupFraction);
    expect(Math.abs(p.x - 718)).toBeLessThan(2);
    expect(Math.abs(p.y - 752)).toBeLessThan(2);
  });

  it.each(["desktop", "mobile"] as const)("%s stop point is where the final frame draws the car", (key) => {
    const sampler = key === "desktop" ? desktop : mobile;
    const p = sampler.atFraction(SCENES[key].stopFraction);
    expect(Math.abs(p.x - SCENES[key].stopAxle.x)).toBeLessThan(2);
    expect(Math.abs(p.y - SCENES[key].stopAxle.y)).toBeLessThan(2);
  });

  it("mobile pickup is at about (214, 497), heading down-left", () => {
    const p = mobile.atFraction(SCENES.mobile.pickupFraction);
    expect(Math.abs(p.x - 214)).toBeLessThan(2);
    expect(Math.abs(p.y - 497)).toBeLessThan(2);
    expect(facingFor(p.angle)).toBe(-1);
  });
});

describe("turn points", () => {
  it("desktop has no turn between pickup and stop", () => {
    const from = SCENES.desktop.pickupFraction * desktop.length;
    const to = SCENES.desktop.stopFraction * desktop.length;
    expect(desktop.turnDistances.filter((d) => d > from && d < to)).toEqual([]);
  });

  it("mobile turns right once between pickup and stop, at about (179, 663)", () => {
    const from = SCENES.mobile.pickupFraction * mobile.length;
    const to = SCENES.mobile.stopFraction * mobile.length;
    const turns = mobile.turnDistances.filter((d) => d > from && d < to);
    expect(turns).toHaveLength(1);
    const p = mobile.at(turns[0]);
    expect(Math.abs(p.x - 179)).toBeLessThan(3);
    expect(Math.abs(p.y - 663)).toBeLessThan(6);
    expect(Math.abs(turns[0] / mobile.length - 0.294)).toBeLessThan(0.01);
  });

  it("the starting facing matches the scene geometry", () => {
    for (const key of ["desktop", "mobile"] as const) {
      const sampler = key === "desktop" ? desktop : mobile;
      expect(facingFor(sampler.atFraction(SCENES[key].pickupFraction).angle)).toBe(SCENES[key].startFacing);
    }
  });
});

describe("sampling", () => {
  it("samples are evenly spaced and start and end on the path's end points", () => {
    const first = desktop.samples[0];
    const last = desktop.samples[desktop.samples.length - 1];
    expect(first.x).toBeCloseTo(505, 5);
    expect(first.y).toBeCloseTo(822, 5);
    expect(last.x).toBeCloseTo(1490, 5);
    expect(last.y).toBeCloseTo(360, 5);
    const step = desktop.length / (desktop.samples.length - 1);
    desktop.samples.forEach((s, i) => expect(s.distance).toBeCloseTo(step * i, 6));
  });

  it("neighbouring samples are about one step apart in space (no jumps)", () => {
    for (const sampler of [desktop, mobile]) {
      const step = sampler.length / (sampler.samples.length - 1);
      for (let i = 1; i < sampler.samples.length; i++) {
        const a = sampler.samples[i - 1];
        const b = sampler.samples[i];
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(step * 1.05);
      }
    }
  });

  it("direction changes smoothly between samples (no flips across ±180)", () => {
    for (const sampler of [desktop, mobile]) {
      for (let i = 1; i < sampler.samples.length; i++) {
        expect(Math.abs(normaliseAngle(sampler.samples[i].angle - sampler.samples[i - 1].angle))).toBeLessThan(15);
      }
    }
  });

  it("clamps outside the route", () => {
    expect(desktop.at(-50)).toEqual(desktop.at(0));
    expect(desktop.at(desktop.length + 50).distance).toBe(desktop.length);
    expect(desktop.atFraction(2).distance).toBe(desktop.length);
  });
});

describe("tilt and facing", () => {
  it("a right-facing car dips its nose going down-right and lifts it going up-right, capped at 6°", () => {
    expect(tiltFor(52, 1)).toBe(6);
    expect(tiltFor(-27, 1)).toBe(-6);
    expect(tiltFor(-4, 1)).toBeCloseTo(-4, 10);
  });

  it("a left-facing (mirrored) car dips its nose going down-left", () => {
    expect(tiltFor(127, -1)).toBe(-6);
    expect(tiltFor(-170, -1)).toBe(6); // travelling up-left lifts its nose (clockwise when mirrored)
    expect(tiltFor(178, -1)).toBeCloseTo(-2, 10);
  });

  it("facing follows the horizontal direction and keeps the previous value when vertical", () => {
    expect(facingFor(10)).toBe(1);
    expect(facingFor(170)).toBe(-1);
    expect(facingFor(90, -1)).toBe(-1);
  });

  it("respects a custom cap", () => {
    expect(tiltFor(30, 1, 12)).toBe(12);
  });
});

describe("parsing", () => {
  it("rejects commands other than absolute M and C", () => {
    expect(() => parseRoute("M 0 0 L 10 10")).toThrow(/unsupported/);
    expect(() => parseRoute("M 0 0 c 1 1 2 2 3 3")).toThrow(/unsupported/);
    expect(() => parseRoute("C 1 1 2 2 3 3")).toThrow(/before M/);
    expect(() => parseRoute("M 0 0")).toThrow(/no curve/);
  });

  it("accepts a C command followed by several coordinate triplets", () => {
    expect(parseRoute("M 0 0 C 1 0 2 0 3 0 4 0 5 0 6 0")).toHaveLength(2);
  });
});
