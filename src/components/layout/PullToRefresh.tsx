"use client";

import { useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 108;
const MAX_PULL_DISTANCE = 170;
const MIN_PULL_START = 18;
const VERTICAL_DOMINANCE = 10;

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const pullingRef = useRef(false);
  const pullActivatedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supportsTouch = "ontouchstart" in window;
    if (!supportsTouch) return;

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      if (event.touches.length !== 1) return;

      startYRef.current = event.touches[0].clientY;
      startXRef.current = event.touches[0].clientX;
      pullingRef.current = true;
      pullActivatedRef.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshing) return;
      if (event.touches.length !== 1) return;

      const deltaY = event.touches[0].clientY - startYRef.current;
      const deltaX = Math.abs(event.touches[0].clientX - startXRef.current);

      if (deltaY <= 0) {
        setPullDistance(0);
        pullActivatedRef.current = false;
        return;
      }

      if (!pullActivatedRef.current) {
        if (deltaY < MIN_PULL_START) return;
        if (deltaY <= deltaX + VERTICAL_DOMINANCE) return;
        pullActivatedRef.current = true;
      }

      if (window.scrollY > 0) {
        pullingRef.current = false;
        pullActivatedRef.current = false;
        setPullDistance(0);
        return;
      }

      const effectiveDelta = Math.max(0, deltaY - MIN_PULL_START);
      const distance = Math.min(MAX_PULL_DISTANCE, effectiveDelta * 0.52);
      setPullDistance(distance);
      event.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pullingRef.current || refreshing) return;

      pullingRef.current = false;
      const isActivated = pullActivatedRef.current;
      pullActivatedRef.current = false;

      if (!isActivated) {
        setPullDistance(0);
        return;
      }

      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        window.setTimeout(() => {
          window.location.reload();
        }, 120);
        return;
      }

      setPullDistance(0);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pullDistance, refreshing]);

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);
  const visible = refreshing || pullDistance > 0;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 10,
        left: "50%",
        transform: `translate(-50%, ${visible ? 0 : -80}px)`,
        transition: refreshing ? "none" : "transform 150ms ease",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(10, 22, 40, 0.9)",
          color: "#fff",
          borderRadius: 999,
          padding: "8px 14px",
          fontSize: "0.75rem",
          fontWeight: 600,
          boxShadow: "0 6px 18px rgba(10, 22, 40, 0.25)",
          border: "1px solid rgba(255,255,255,0.15)",
          minWidth: 120,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {refreshing && (
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.35)",
              borderTopColor: "#fff",
              animation: "ptr-spin 0.8s linear infinite",
            }}
          />
        )}
        {refreshing ? "Refreshing..." : progress >= 1 ? "Release to refresh" : "Pull to refresh"}
      </div>

      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
