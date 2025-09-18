"use client";

import React from "react";
import dynamic from "next/dynamic";
// Load the composition component client-side too
const FirstFrame = dynamic(
  () => import("../../remotion/FirstFrame").then((m) => m.FirstFrame),
  { ssr: false }
);

// Load Player only on the client to avoid SSR issues
const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), {
  ssr: false,
});

export default function RemotionPreviewPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>Remotion Preview: First Frame</h1>
      {mounted ? (
        <Player
          component={FirstFrame}
        durationInFrames={600}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          controls
          style={{ width: "100%", maxWidth: 500, borderRadius: 8, overflow: "hidden" }}
        />
      ) : null}
    </div>
  );
}
