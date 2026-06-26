"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const LEFT_SPLIT_IMAGE_PRIMARY = "/left-split-bg.jpg";
const LEFT_SPLIT_IMAGE_FALLBACK = "/fl-logo-white.webp";

export function GlobalDarkBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [bgImage, setBgImage] = useState(LEFT_SPLIT_IMAGE_PRIMARY);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (resolvedTheme !== "dark") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        background: "var(--navy)",
        overflow: "hidden"
      }}
    >
      {/* Background media */}
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        onError={() => setBgImage(LEFT_SPLIT_IMAGE_FALLBACK)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Tints and gradients keep the image visible while aligning with FLC tokens. */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg, rgba(15,17,20,0.88) 0%, rgba(22,24,28,0.72) 48%, rgba(15,23,42,0.44) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 14% 86%, rgba(148,163,184,0.12) 0%, rgba(148,163,184,0) 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 55% at 88% 14%, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0) 75%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(3,8,16,0.38) 0%, rgba(3,8,16,0) 55%)" }} />
    </div>
  );
}
