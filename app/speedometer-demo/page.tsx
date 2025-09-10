'use client';

import React, { useEffect, useRef, useState } from 'react';
import FuturisticSpeedometer from '@/components/FuturisticSpeedometer';
import Link from 'next/link';

export default function SpeedometerDemoPage() {
  const [value, setValue] = useState(95);
  const [autoPlay, setAutoPlay] = useState(true);
  const dirRef = useRef<1 | -1>(1);

  // Simple bounce animation for demo purposes
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    function tick(now: number) {
      const dt = Math.min(0.06, (now - last) / 1000); // clamp
      last = now;
      setValue((v) => {
        const speed = 45; // units per second
        const next = v + dirRef.current * speed * dt;
        if (next >= 160) {
          dirRef.current = -1;
          return 160;
        }
        if (next <= 0) {
          dirRef.current = 1;
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    }
    if (autoPlay) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoPlay]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Futuristic Speedometer Demo</h1>
          <Link href="/" className="text-sky-400 hover:text-sky-300">Back to Home</Link>
        </div>

        <FuturisticSpeedometer value={value} min={0} max={160} units="MPH" />

        <div className="mt-8 grid gap-6 rounded-xl border border-white/10 bg-slate-900/40 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-slate-300">Value</label>
            <input
              type="range"
              min={0}
              max={160}
              value={Math.round(value)}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-80 accent-sky-400"
              disabled={autoPlay}
            />
            <span className="w-14 text-right tabular-nums">{Math.round(value)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoPlay((s) => !s)}
              className="inline-flex items-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              {autoPlay ? 'Pause Animation' : 'Play Animation'}
            </button>
            <p className="text-sm text-slate-400">This page is isolated and does not affect the existing upload page.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

