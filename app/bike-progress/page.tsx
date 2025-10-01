"use client";

import Script from "next/script";

export default function BikeProgressDemo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 gap-6">
      <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />

      <div className="text-center max-w-xl space-y-3">
        <h1 className="text-3xl font-bold">Bike Progress Animation</h1>
        <p className="text-sm text-slate-300">
          This page renders the <code>Bike Progress.json</code> Lottie animation right in the browser so you can
          preview it instead of reading the raw JSON.
        </p>
      </div>

      <div className="bg-white/5 rounded-3xl border border-white/10 shadow-xl p-8">
        {/* eslint-disable-next-line react/no-unknown-property */}
        <lottie-player
          src="/Bike%20Progress.json"
          background="transparent"
          speed="1"
          style={{ width: "420px", height: "420px" }}
          loop
          autoplay
        />
      </div>
    </div>
  );
}
