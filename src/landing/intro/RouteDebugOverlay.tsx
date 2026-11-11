import { useMemo } from "react";
import type { SceneGeometry } from "../scenes/sceneGeometry";
import { createRouteSampler } from "./routeSampler";

// Development aid for /intro-preview?debug: draws what the route sampler computes on top of the art.
// If the maths and the drawing agree, every marker sits on the dotted route and the green ring
// sits on the car's axle point in the final frame.
export default function RouteDebugOverlay({ geometry }: { geometry: SceneGeometry }) {
  const sampler = useMemo(() => createRouteSampler(geometry.route), [geometry.route]);
  const unit = Math.max(geometry.width, geometry.height) / 150; // marker size scales with the scene
  const pickup = sampler.atFraction(geometry.pickupFraction);
  const stop = sampler.atFraction(geometry.stopFraction);
  const turns = sampler.turnDistances.map((d) => sampler.at(d));
  const label = (x: number, y: number, text: string, color: string) => {
    const nearRightEdge = x > geometry.width * 0.7; // keep labels inside the scene
    return (
      <text
        x={nearRightEdge ? x - unit * 1.6 : x + unit * 1.6}
        y={y - unit * 1.2}
        textAnchor={nearRightEdge ? "end" : "start"}
        fontSize={unit * 1.7}
        fill={color}
        fontFamily="monospace"
        fontWeight="700"
      >
        {text}
      </text>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <polyline
        points={sampler.samples.map((s) => `${s.x},${s.y}`).join(" ")}
        fill="none"
        stroke="#E11D48"
        strokeWidth={unit * 0.25}
        strokeDasharray={`${unit} ${unit * 0.6}`}
      />
      <circle cx={pickup.x} cy={pickup.y} r={unit} fill="#2563EB" />
      {label(pickup.x, pickup.y, `pickup ${geometry.pickupFraction}`, "#2563EB")}
      {turns.map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y} r={unit} fill="#EA580C" />
          {label(t.x, t.y, `turn ${(t.distance / sampler.length).toFixed(3)}`, "#EA580C")}
        </g>
      ))}
      <circle cx={stop.x} cy={stop.y} r={unit} fill="#16A34A" />
      <circle cx={geometry.stopAxle.x} cy={geometry.stopAxle.y} r={unit * 1.8} fill="none" stroke="#16A34A" strokeWidth={unit * 0.35} />
      {label(stop.x, stop.y, `stop ${geometry.stopFraction}`, "#16A34A")}
      <text x={unit * 2} y={geometry.height - unit * 2} fontSize={unit * 1.7} fill="#E11D48" fontFamily="monospace" fontWeight="700">
        {`${geometry.key} · route ${sampler.length.toFixed(1)} units · ${sampler.samples.length} samples`}
      </text>
    </svg>
  );
}
