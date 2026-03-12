"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const LEFT_SPLIT_VIDEO_PRIMARY = "/left-split-bg.mp4";
const LEFT_SPLIT_VIDEO_FALLBACK = "/splash-bg.mp4";
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
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={bgImage}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      >
        <source src={LEFT_SPLIT_VIDEO_PRIMARY} type="video/mp4" />
        <source src={LEFT_SPLIT_VIDEO_FALLBACK} type="video/mp4" />
      </video>

      {/* Tints and Gradients to match PublicSplitShell exactly */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg, rgba(6,15,30,0.84) 0%, rgba(8,20,40,0.68) 48%, rgba(17,33,59,0.6) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 14% 86%, rgba(224, 186, 112, 0.14) 0%, rgba(224, 186, 112, 0) 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 55% at 88% 14%, rgba(150, 174, 215, 0.2) 0%, rgba(150, 174, 215, 0) 75%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(3,8,16,0.38) 0%, rgba(3,8,16,0) 55%)" }} />
    </div>
  );
}
