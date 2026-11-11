import { describe, expect, it } from "vitest";
import { mapScroll } from "./scrollMapping";

const OFF = { start: 0, distance: 0 };
const ON_DESKTOP = { start: 0, distance: 2250 }; // 900px screen x 2.5
const ON_MOBILE = { start: 0, distance: 1688 }; // 844px screen x 2

describe("turning Motion OFF", () => {
  it("before the intro is scrolled into: nothing moves", () => {
    expect(mapScroll(0, ON_DESKTOP, OFF)).toBe(0);
  });
  it("midway through the story: returns to the top of the intro (the view stays on the stage)", () => {
    expect(mapScroll(1125, ON_DESKTOP, OFF)).toBe(0);
  });
  it("after the intro: content in view stays put (pin distance removed)", () => {
    expect(mapScroll(2250 + 400, ON_DESKTOP, OFF)).toBe(400);
  });
});

describe("turning Motion ON", () => {
  it("with the intro on screen: jumps to the end of the pin so the final frame stays put", () => {
    expect(mapScroll(0, OFF, ON_DESKTOP)).toBe(2250);
  });
  it("after the intro: content in view stays put (pin distance added)", () => {
    expect(mapScroll(400, OFF, ON_DESKTOP)).toBe(2650);
  });
});

describe("rebuilding with Motion ON (rotation, resize)", () => {
  it("keeps the story at the same progress", () => {
    expect(mapScroll(1125, ON_DESKTOP, ON_MOBILE)).toBe(844);
  });
  it("is a no-op when nothing changed (React Strict Mode runs effects twice)", () => {
    for (const y of [0, 10, 1125, 2250, 3000]) expect(mapScroll(y, ON_DESKTOP, ON_DESKTOP)).toBe(y);
    expect(mapScroll(0, OFF, OFF)).toBe(0);
  });
  it("after the intro: shifts by the change in pin distance", () => {
    expect(mapScroll(2250 + 300, ON_DESKTOP, ON_MOBILE)).toBe(1688 + 300);
  });
  it("leaves positions above the stage alone", () => {
    expect(mapScroll(50, { start: 200, distance: 2250 }, { start: 200, distance: 1688 })).toBe(50);
  });
});
