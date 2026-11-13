// The intro's master timeline, as plain data.
//
// GSAP animates only the plain `IntroState` object below, never the DOM. `computeFrame` turns a state
// into transforms and opacities, and `domApplier.ts` writes a frame to the SVG. Keeping the DOM out of
// the timeline means the whole story can be run and checked in tests at any progress, in both directions.
//
// Times are on a 100-unit timeline (1 unit = 1% of the pinned scroll), as in the Intro Animation Script.

import gsap from "gsap";
import type { Caption } from "./captions";
import { facingFor, tiltFor, type RoutePoint, type RouteSampler } from "./routeSampler";
import type { Point, SceneGeometry } from "../scenes/sceneGeometry";

export const TIMELINE_LENGTH = 100;

/** Phase windows on the 100-unit timeline. */
export const PHASES = {
  hintFade: [0, 3],
  /** The first student to set off walks from `walkStart` for `walkLength`; each next one starts `walkStagger` later. */
  walkStart: 2,
  walkLength: 22,
  walkStagger: 2,
  /** Each student fades into the car over `boardLength` units, starting `boardLead` before their walk ends. */
  boardLead: 1,
  boardLength: 2,
  /** The seated passenger fades in this long after their student starts boarding. */
  passengerDelay: 0.5,
  passengerFade: 2,
  dotsToPickup: [32, 36],
  drive: [36, 88],
  tiltIn: [36, 40],
  tiltOut: [88, 92],
  dotsToPin: [88, 94],
  /** The car mirrors over this many units, centred on each turn. */
  flipLength: 4,
  /** Leg pose alternates every this many units while walking. */
  stepEvery: 2,
  captionFade: 2,
} as const;

const DRIVE_EASE = "power1.inOut";
const WALK_EASE = "sine.inOut";

/** Where each student stops beside the car, in the car's own units: under the flat part of the roof
 * (the rear window slopes down, so a stop under it would let hair and caps show above the roof), and a
 * little above the wheel line, so they stand just behind the car with only their shoes showing. */
const STOP_X = [100, 140, 180] as const;
const STOP_Y = 148;
/** Seated heads are 0.9x the standing students' heads, in the car's units. */
const SEATED_SCALE = 0.9;

export interface IntroState {
  /** Car's distance along the route (scene units). */
  distance: number;
  /** 0 = car level, 1 = full tilt along the route. */
  tiltWeight: number;
  /** Horizontal scale sign of the car, animated through 0 when it turns: 1 = facing right, -1 = left. */
  flip: number;
  /** Length of the dotted line drawn so far (scene units). */
  dots: number;
  hint: number;
  walk: [number, number, number];
  board: [number, number, number];
  stand: [number, number, number];
  passenger: [number, number, number];
  /** 1 = leg pose A shown, 0 = pose B. */
  legs: [number, number, number];
  captions: number[];
}

export interface StudentFrame {
  /** Feet position in scene units. */
  x: number;
  y: number;
  transform: string;
  opacity: number;
  legsA: boolean;
}

export interface IntroFrame {
  car: { x: number; y: number; tilt: number; flip: number; transform: string };
  students: [StudentFrame, StudentFrame, StudentFrame];
  passengers: [number, number, number];
  /** Dotted line drawn so far, and the full route length, both in sampled scene units. */
  dots: number;
  dotsRouteLength: number;
  captions: number[];
  hint: number;
}

export interface StudentSchedule {
  walk: [number, number];
  board: [number, number];
  passenger: [number, number];
}

export interface IntroTimeline {
  timeline: gsap.core.Timeline;
  state: IntroState;
  /** Per student (index 0–2 = stand-1–3): when they walk, board, and appear seated. */
  schedule: StudentSchedule[];
  /** Distances along the route used by the story. */
  pickupDistance: number;
  stopDistance: number;
  /** Timeline positions where the car turns (mobile only), in units. */
  turnTimes: number[];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fixed = (n: number) => (Math.abs(n) < 1e-9 ? 0 : Number(n.toFixed(3)));

/** Where student n stops beside the waiting car: under their window, on the car's ground line. */
export function seatPoint(geometry: SceneGeometry, pickup: RoutePoint, index: number): Point {
  const s = geometry.carScale;
  return {
    x: pickup.x + geometry.startFacing * s * (STOP_X[index] - geometry.carAnchor.x),
    y: pickup.y + s * (STOP_Y - geometry.carAnchor.y),
  };
}

/**
 * Each student's starting spot. The scene offers three spots; students take them in the same left-to-right
 * order as their stops beside the car, so no one has to cross another's path. (On mobile the car faces
 * left, so its rear window, and the backpack student's seat, is on the right.)
 */
export function studentStartPoints(geometry: SceneGeometry, pickup: RoutePoint): [Point, Point, Point] {
  const spots = [...geometry.studentStarts].sort((a, b) => a.x - b.x);
  const byStopX = [0, 1, 2].sort((a, b) => seatPoint(geometry, pickup, a).x - seatPoint(geometry, pickup, b).x);
  const starts: Point[] = [];
  byStopX.forEach((n, i) => {
    starts[n] = spots[i];
  });
  return starts as [Point, Point, Point];
}

/**
 * When each student walks and boards. The student with the shortest walk sets off first and the others
 * follow at the same pace, so the three never bunch up; they board in the order they arrive.
 */
export function studentSchedule(geometry: SceneGeometry, pickup: RoutePoint): StudentSchedule[] {
  const starts = studentStartPoints(geometry, pickup);
  const distances = [0, 1, 2].map((n) => {
    const seat = seatPoint(geometry, pickup, n);
    const start = starts[n];
    return Math.hypot(seat.x - start.x, seat.y - start.y);
  });
  const order = [0, 1, 2].sort((a, b) => distances[a] - distances[b]);
  const schedule: StudentSchedule[] = [];
  order.forEach((n, slot) => {
    const walkStart = PHASES.walkStart + slot * PHASES.walkStagger;
    const walkEnd = walkStart + PHASES.walkLength;
    const boardStart = walkEnd - PHASES.boardLead;
    const passengerStart = boardStart + PHASES.passengerDelay;
    schedule[n] = {
      walk: [walkStart, walkEnd],
      board: [boardStart, boardStart + PHASES.boardLength],
      passenger: [passengerStart, passengerStart + PHASES.passengerFade],
    };
  });
  return schedule;
}

/** The car's SVG transform: axle on the route, tilted, mirrored by `flip`, scaled. */
export function carTransform(geometry: SceneGeometry, x: number, y: number, tilt: number, flip: number): string {
  const s = geometry.carScale;
  const parts = [`translate(${fixed(x)},${fixed(y)})`];
  if (fixed(tilt) !== 0) parts.push(`rotate(${fixed(tilt)})`);
  parts.push(`scale(${fixed(flip * s)},${fixed(s)})`);
  parts.push(`translate(${-geometry.carAnchor.x},${-geometry.carAnchor.y})`);
  return parts.join(" ");
}

/** Timeline position (units) at which a drive with `ease` reaches `fraction` of its distance. */
export function timeForFraction(fraction: number, ease: string = DRIVE_EASE): number {
  const easeFn = gsap.parseEase(ease);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (easeFn(mid) < fraction) lo = mid;
    else hi = mid;
  }
  const [start, end] = PHASES.drive;
  return start + ((lo + hi) / 2) * (end - start);
}

/** Builds the paused master timeline for one scene. */
export function buildIntroTimeline(geometry: SceneGeometry, sampler: RouteSampler, captions: readonly Caption[]): IntroTimeline {
  const pickupDistance = geometry.pickupFraction * sampler.length;
  const stopDistance = geometry.stopFraction * sampler.length;

  const state: IntroState = {
    distance: pickupDistance,
    tiltWeight: 0,
    flip: geometry.startFacing,
    dots: 0,
    hint: 1,
    walk: [0, 0, 0],
    board: [0, 0, 0],
    stand: [1, 1, 1],
    passenger: [0, 0, 0],
    legs: [1, 1, 1],
    captions: captions.map((_, i) => (i === 0 ? 1 : 0)),
  };

  // lazy: false so values are written as soon as the playhead moves (scrubbing and tests read them at once).
  const tl = gsap.timeline({ paused: true, defaults: { lazy: false, ease: "none" } });

  // Scroll hint
  tl.to(state, { hint: 0, duration: PHASES.hintFade[1] - PHASES.hintFade[0] }, PHASES.hintFade[0]);

  // Students: walk with alternating legs, then shrink and fade into the car while the seated version appears.
  const schedule = studentSchedule(geometry, sampler.atFraction(geometry.pickupFraction));
  for (let n = 0; n < 3; n++) {
    const [walkStart, walkEnd] = schedule[n].walk;
    const [boardStart, boardEnd] = schedule[n].board;
    tl.to(state.walk, { [n]: 1, duration: walkEnd - walkStart, ease: WALK_EASE }, walkStart);
    let pose = 1;
    for (let t = walkStart + PHASES.stepEvery; t < walkEnd; t += PHASES.stepEvery) {
      pose = 1 - pose;
      tl.set(state.legs, { [n]: pose }, t);
    }
    tl.set(state.legs, { [n]: 1 }, walkEnd); // stand still in pose A
    tl.to(state.board, { [n]: 1, duration: boardEnd - boardStart, ease: "power1.in" }, boardStart);
    tl.to(state.stand, { [n]: 0, duration: boardEnd - boardStart }, boardStart);
    tl.to(state.passenger, { [n]: 1, duration: PHASES.passengerFade }, schedule[n].passenger[0]);
  }

  // Dotted line: the stretch the students walked, then locked to the car, then on to the pin.
  tl.to(state, { dots: pickupDistance, duration: PHASES.dotsToPickup[1] - PHASES.dotsToPickup[0] }, PHASES.dotsToPickup[0]);
  const driveLength = PHASES.drive[1] - PHASES.drive[0];
  tl.to(state, { dots: stopDistance, duration: driveLength, ease: DRIVE_EASE }, PHASES.drive[0]);
  tl.to(state, { dots: sampler.length, duration: PHASES.dotsToPin[1] - PHASES.dotsToPin[0] }, PHASES.dotsToPin[0]);

  // The drive. Same ease and window as the dots, so the line never runs ahead of the car.
  tl.to(state, { distance: stopDistance, duration: driveLength, ease: DRIVE_EASE }, PHASES.drive[0]);
  tl.to(state, { tiltWeight: 1, duration: PHASES.tiltIn[1] - PHASES.tiltIn[0], ease: "sine.inOut" }, PHASES.tiltIn[0]);
  tl.to(state, { tiltWeight: 0, duration: PHASES.tiltOut[1] - PHASES.tiltOut[0], ease: "sine.inOut" }, PHASES.tiltOut[0]);

  // Turns between pickup and stop (mobile): mirror the car through zero width, centred on the turn.
  const turnTimes: number[] = [];
  let facing = geometry.startFacing;
  for (const turn of sampler.turnDistances) {
    if (turn <= pickupDistance || turn >= stopDistance) continue;
    const time = timeForFraction((turn - pickupDistance) / (stopDistance - pickupDistance));
    facing = facing === 1 ? -1 : 1;
    turnTimes.push(time);
    tl.to(state, { flip: facing, duration: PHASES.flipLength, ease: "sine.inOut" }, time - PHASES.flipLength / 2);
  }

  // Captions: the first is up from the start; each fades out at its end, the next fades in at its start.
  captions.forEach((caption, i) => {
    if (i > 0) tl.to(state.captions, { [i]: 1, duration: PHASES.captionFade }, caption.from);
    if (i < captions.length - 1) tl.to(state.captions, { [i]: 0, duration: PHASES.captionFade }, caption.to);
  });

  // Hold to the end.
  tl.to({}, { duration: 0 }, TIMELINE_LENGTH);

  return { timeline: tl, state, schedule, pickupDistance, stopDistance, turnTimes };
}

/** Turns a state into what the SVG and captions should show. Pure. */
export function computeFrame(state: IntroState, geometry: SceneGeometry, sampler: RouteSampler): IntroFrame {
  const point = sampler.at(state.distance);
  const facing: 1 | -1 = state.flip > 0 ? 1 : state.flip < 0 ? -1 : facingFor(point.angle);
  const tilt = tiltFor(point.angle, facing) * state.tiltWeight || 0; // `|| 0` turns -0 into 0
  const pickup = sampler.atFraction(geometry.pickupFraction);
  const mirror = geometry.studentsMirrored ? -1 : 1;
  const starts = studentStartPoints(geometry, pickup);

  const students = [0, 1, 2].map((n): StudentFrame => {
    const start = starts[n];
    const seat = seatPoint(geometry, pickup, n);
    const x = lerp(start.x, seat.x, state.walk[n]);
    const y = lerp(start.y, seat.y, state.walk[n]);
    const scale = lerp(geometry.studentScale, geometry.carScale * SEATED_SCALE, state.board[n]);
    return {
      x,
      y,
      transform: `translate(${fixed(x)},${fixed(y)}) scale(${fixed(mirror * scale)},${fixed(scale)})`,
      opacity: state.stand[n],
      legsA: state.legs[n] >= 0.5,
    };
  }) as [StudentFrame, StudentFrame, StudentFrame];

  return {
    car: { x: point.x, y: point.y, tilt, flip: state.flip, transform: carTransform(geometry, point.x, point.y, tilt, state.flip) },
    students,
    passengers: [state.passenger[0], state.passenger[1], state.passenger[2]],
    dots: state.dots,
    dotsRouteLength: sampler.length,
    captions: [...state.captions],
    hint: state.hint,
  };
}
