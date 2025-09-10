'use client';

import React, { useMemo } from 'react';

type Props = {
  value: number; // current speed value
  min?: number;
  max?: number;
  units?: string; // e.g. 'MPH'
};

// Convert polar coordinates to cartesian for SVG positioning
function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Build an SVG Arc Path between angles (clockwise)
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  // allow endAngle to be < startAngle by wrapping
  let s = startAngle;
  let e = endAngle;
  if (e < s) e += 360;
  const largeArc = e - s <= 180 ? 0 : 1;
  const start = polarToCartesian(cx, cy, r, e);
  const end = polarToCartesian(cx, cy, r, s);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export default function FuturisticSpeedometer({
  value,
  min = 0,
  max = 160,
  units = 'MPH',
}: Props) {
  // Gauge geometry
  const size = 420; // SVG viewbox size
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 170;
  const innerR = 140;

  // A wide arc similar to EV cluster style
  const startAngle = 140; // left upper
  const endAngle = 400; // wraps past 360 for a ~260° sweep

  const sweep = endAngle - startAngle;
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const valueAngle = startAngle + pct * sweep;

  // Ticks and labels
  const majorStep = 20; // 0..160 in 20s
  const minorStep = 10;
  const majors = useMemo(() => {
    const arr: { angle: number; label: number }[] = [];
    for (let v = min; v <= max; v += majorStep) {
      const f = (v - min) / (max - min);
      arr.push({ angle: startAngle + f * sweep, label: v });
    }
    return arr;
  }, [min, max, sweep]);

  const minors = useMemo(() => {
    const arr: number[] = [];
    for (let v = min; v <= max; v += minorStep) {
      if (v % majorStep === 0) continue;
      const f = (v - min) / (max - min);
      arr.push(startAngle + f * sweep);
    }
    return arr;
  }, [min, max, sweep]);

  // Paths
  const trackPath = describeArc(cx, cy, outerR, startAngle, endAngle);
  const glowPath = describeArc(cx, cy, outerR + 8, startAngle, valueAngle);
  const progressPath = describeArc(cx, cy, outerR, startAngle, valueAngle);

  // Needle geometry
  const needleLen = innerR + 18;
  const needleBase = 10;
  const needleTip = polarToCartesian(cx, cy, needleLen, valueAngle);
  const needleLeft = polarToCartesian(cx, cy, needleBase, valueAngle - 90);
  const needleRight = polarToCartesian(cx, cy, needleBase, valueAngle + 90);

  return (
    <div
      className="relative mx-auto w-full max-w-2xl select-none"
      style={{ filter: 'drop-shadow(0 0 30px rgba(59,130,246,0.25))' }}
    >
      <div className="rounded-2xl bg-gradient-to-br from-[#0b1025] via-[#0a0f1f] to-black p-6">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
          <defs>
            {/* neon gradient for progress */}
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* background halo */}
          <circle cx={cx} cy={cy} r={innerR + 50} fill="url(#center-glow)" />

          {/* Track */}
          <path d={trackPath} stroke="#0f172a" strokeWidth={18} fill="none" strokeLinecap="round" />

          {/* Progress glow */}
          <path
            d={glowPath}
            stroke="url(#gauge-gradient)"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
            opacity={0.35}
            filter="url(#soft-glow)"
          />

          {/* Progress */}
          <path
            d={progressPath}
            stroke="url(#gauge-gradient)"
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />

          {/* Minor ticks */}
          {minors.map((angle, i) => {
            const p1 = polarToCartesian(cx, cy, outerR - 4, angle);
            const p2 = polarToCartesian(cx, cy, innerR - 10, angle);
            return (
              <line
                key={`minor-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#334155"
                strokeWidth={2}
              />
            );
          })}

          {/* Major ticks + labels */}
          {majors.map(({ angle, label }, i) => {
            const p1 = polarToCartesian(cx, cy, outerR + 2, angle);
            const p2 = polarToCartesian(cx, cy, innerR - 20, angle);
            const textPos = polarToCartesian(cx, cy, innerR - 40, angle);
            return (
              <g key={`major-${i}`}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeWidth={3} />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={18}
                  fill="#cbd5e1"
                  style={{ fontWeight: 600 }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Centered value */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white" style={{ fontSize: 76, fontWeight: 800 }}>
            {Math.round(value)}
          </text>
          <text x={cx} y={cy + 40} textAnchor="middle" className="fill-sky-300/80" style={{ fontSize: 20, letterSpacing: 3 }}>
            {units}
          </text>

          {/* Needle */}
          <g>
            <circle cx={cx} cy={cy} r={14} fill="#0ea5e9" opacity={0.15} />
            <circle cx={cx} cy={cy} r={6} fill="#38bdf8" />
            <polygon
              points={`${needleLeft.x},${needleLeft.y} ${needleRight.x},${needleRight.y} ${needleTip.x},${needleTip.y}`}
              fill="#e2e8f0"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

