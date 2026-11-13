// Route geometry for the intro animation: positions, directions and turn points along an SVG path,
// measured by distance travelled. Pure TypeScript with no DOM, so it gives the same answers in the
// browser and in tests.
//
// The intro's routes are hand-drawn cubic Béziers written as "M x y C x1 y1 x2 y2 x y …" in absolute
// coordinates. Only M and C are supported; anything else throws, so a future art change that uses
// other commands fails loudly in tests instead of drawing the car off the road.

export interface RoutePoint {
  x: number;
  y: number;
  /** Direction of travel in degrees, SVG convention: 0 = right, 90 = down, ±180 = left. */
  angle: number;
  /** Distance along the route from its start, in scene units. */
  distance: number;
}

export interface CubicSegment {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  p3: [number, number];
}

export interface RouteSampler {
  /** Total route length in scene units. */
  length: number;
  /** Evenly spaced samples by distance, first at 0 and last at `length`. */
  samples: RoutePoint[];
  /** Point at a distance along the route (clamped to the route). */
  at(distance: number): RoutePoint;
  /** Point at a share of the route length, 0–1 (clamped). */
  atFraction(fraction: number): RoutePoint;
  /** Distances where the horizontal direction of travel reverses (left ↔ right), in order. */
  turnDistances: number[];
}

/** Parses an absolute "M … C …" path into cubic segments. Throws on anything else. */
export function parseRoute(d: string): CubicSegment[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const segments: CubicSegment[] = [];
  let i = 0;
  let current: [number, number] | null = null;
  const num = (): number => {
    const token = tokens[i++];
    const value = Number(token);
    if (token === undefined || Number.isNaN(value)) throw new Error(`Route path: expected a number at token ${i - 1}`);
    return value;
  };
  const isNumber = (token: string | undefined) => token !== undefined && !/[a-zA-Z]/.test(token);

  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === "M") {
      current = [num(), num()];
      if (isNumber(tokens[i])) throw new Error("Route path: implicit line-to after M is not supported");
    } else if (command === "C") {
      if (!current) throw new Error("Route path: C before M");
      do {
        const p1: [number, number] = [num(), num()];
        const p2: [number, number] = [num(), num()];
        const p3: [number, number] = [num(), num()];
        segments.push({ p0: current, p1, p2, p3 });
        current = p3;
      } while (isNumber(tokens[i]));
    } else {
      throw new Error(`Route path: unsupported command "${command}" (only absolute M and C are supported)`);
    }
  }
  if (segments.length === 0) throw new Error("Route path: no curve segments");
  return segments;
}

function cubicPoint(s: CubicSegment, t: number): [number, number] {
  const m = 1 - t;
  const a = m * m * m;
  const b = 3 * m * m * t;
  const c = 3 * m * t * t;
  const e = t * t * t;
  return [
    a * s.p0[0] + b * s.p1[0] + c * s.p2[0] + e * s.p3[0],
    a * s.p0[1] + b * s.p1[1] + c * s.p2[1] + e * s.p3[1],
  ];
}

function cubicTangent(s: CubicSegment, t: number): [number, number] {
  const m = 1 - t;
  const a = 3 * m * m;
  const b = 6 * m * t;
  const c = 3 * t * t;
  return [
    a * (s.p1[0] - s.p0[0]) + b * (s.p2[0] - s.p1[0]) + c * (s.p3[0] - s.p2[0]),
    a * (s.p1[1] - s.p0[1]) + b * (s.p2[1] - s.p1[1]) + c * (s.p3[1] - s.p2[1]),
  ];
}

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Normalises an angle to (-180, 180]. */
export function normaliseAngle(angle: number): number {
  let a = ((angle % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return a;
}

function lerpAngle(a: number, b: number, t: number): number {
  return a + normaliseAngle(b - a) * t;
}

/**
 * Builds a distance-based lookup table for a route. `sampleCount` evenly spaced samples
 * (default 400) are enough for smooth motion; `stepsPerSegment` controls measuring accuracy.
 */
export function createRouteSampler(d: string, sampleCount = 400, stepsPerSegment = 400): RouteSampler {
  if (sampleCount < 2) throw new Error("sampleCount must be at least 2");
  const segments = parseRoute(d);

  // 1. Dense walk along every segment, accumulating arc length.
  type Dense = { x: number; y: number; dx: number; dy: number; distance: number };
  const dense: Dense[] = [];
  let total = 0;
  segments.forEach((segment, index) => {
    for (let k = index === 0 ? 0 : 1; k <= stepsPerSegment; k++) {
      const t = k / stepsPerSegment;
      const [x, y] = cubicPoint(segment, t);
      let [dx, dy] = cubicTangent(segment, t);
      if (Math.hypot(dx, dy) < 1e-9) {
        // Degenerate tangent at an end point (control point on top of it): look slightly inwards.
        [dx, dy] = cubicTangent(segment, Math.min(Math.max(t, 1e-4), 1 - 1e-4));
      }
      if (dense.length > 0) {
        const prev = dense[dense.length - 1];
        total += Math.hypot(x - prev.x, y - prev.y);
      }
      dense.push({ x, y, dx, dy, distance: total });
    }
  });

  // 2. Resample at even distances.
  const samples: RoutePoint[] = [];
  let j = 0;
  for (let n = 0; n < sampleCount; n++) {
    const target = (total * n) / (sampleCount - 1);
    while (j < dense.length - 2 && dense[j + 1].distance < target) j++;
    const a = dense[j];
    const b = dense[j + 1];
    const span = b.distance - a.distance;
    const t = span > 0 ? Math.min(Math.max((target - a.distance) / span, 0), 1) : 0;
    const angleA = toDegrees(Math.atan2(a.dy, a.dx));
    const angleB = toDegrees(Math.atan2(b.dy, b.dx));
    samples.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      angle: normaliseAngle(lerpAngle(angleA, angleB, t)),
      distance: target,
    });
  }

  // 3. Horizontal reversals, found on the dense walk. Ignore near-vertical jitter: a reversal must
  //    persist for a few units of travel before it counts.
  const turnDistances: number[] = [];
  const MIN_RUN = 4;
  let sign = 0;
  let candidate: { distance: number; sign: number } | null = null;
  for (const p of dense) {
    const s = p.dx > 1e-6 ? 1 : p.dx < -1e-6 ? -1 : 0;
    if (s === 0) continue;
    if (sign === 0) {
      sign = s;
      continue;
    }
    if (s !== sign) {
      if (!candidate || candidate.sign !== s) candidate = { distance: p.distance, sign: s };
      if (p.distance - candidate.distance >= MIN_RUN) {
        turnDistances.push(candidate.distance);
        sign = s;
        candidate = null;
      }
    } else {
      candidate = null;
    }
  }

  const at = (distance: number): RoutePoint => {
    const clamped = Math.min(Math.max(distance, 0), total);
    const position = (clamped / total) * (sampleCount - 1);
    const i0 = Math.min(Math.floor(position), sampleCount - 2);
    const t = position - i0;
    const a = samples[i0];
    const b = samples[i0 + 1];
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      angle: normaliseAngle(lerpAngle(a.angle, b.angle, t)),
      distance: clamped,
    };
  };

  return {
    length: total,
    samples,
    at,
    atFraction: (fraction: number) => at(Math.min(Math.max(fraction, 0), 1) * total),
    turnDistances,
  };
}

/**
 * Which way the car faces when travelling at `angle`: 1 = right, -1 = left (mirrored).
 * Exactly vertical travel keeps `previous`.
 */
export function facingFor(angle: number, previous: 1 | -1 = 1): 1 | -1 {
  const dx = Math.cos((angle * Math.PI) / 180);
  if (Math.abs(dx) < 1e-6) return previous;
  return dx > 0 ? 1 : -1;
}

/**
 * The car's tilt in degrees for a direction of travel: the slope measured against the way the car
 * faces, clamped to ±cap. Positive = clockwise in SVG. A car facing right that drives down-right
 * dips its nose (positive); a mirrored car facing left that drives down-left dips its nose
 * (negative, because its nose is on the left).
 */
export function tiltFor(angle: number, facing: 1 | -1, cap = 6): number {
  const facingAngle = facing === 1 ? 0 : 180;
  const slope = normaliseAngle(angle - facingAngle);
  return Math.min(Math.max(slope, -cap), cap);
}
