"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pull distance (after resistance) that triggers a refresh. */
const THRESHOLD = 80;
/** The furthest the indicator travels. */
const MAX_PULL = 120;
/** Finger travel ignored before a pull counts, so ordinary scrolls never start one. */
const DEAD_ZONE = 24;

/** Overlays, fields and anything marked data-no-pull handle their own gestures. */
const IGNORE_SELECTOR =
  "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox'], [data-slot='sheet-content'], [data-vaul-drawer], [data-no-pull], input, textarea, select";

/**
 * True when the touch starts inside something scrolled away from its top. The
 * staff portal scrolls an inner <main>, not the window, so window.scrollY
 * alone would turn every downward swipe into a pull.
 */
function scrolledAboveTop(target: EventTarget | null): boolean {
  if (window.scrollY > 0) return true;
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    if (el.scrollTop > 0) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY === "auto" || overflowY === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Pull down from the top of a page to re-fetch its data — the BMS gesture: a
 * small round indicator that follows the finger with rubber-band resistance,
 * then refreshes in place (filters, scroll and form input survive).
 */
export default function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const tracking = useRef(false);
  const active = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!("ontouchstart" in window)) return;

    const set = (d: number) => {
      pullRef.current = d;
      setPull(d);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return;
      const target = e.target;
      if (target instanceof Element && target.closest(IGNORE_SELECTOR)) return;
      if (scrolledAboveTop(target)) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      tracking.current = true;
      active.current = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = Math.abs(e.touches[0].clientX - startX.current);

      if (!active.current) {
        if (dy <= 0 || dx > dy) {
          // Scrolling down or swiping sideways: not a pull.
          if (dy < 0 || dx > DEAD_ZONE) tracking.current = false;
          return;
        }
        if (dy < DEAD_ZONE) return;
        active.current = true;
      }

      const travel = Math.max(0, dy - DEAD_ZONE);
      // Rubber-band resistance: each extra pixel counts for less.
      const resistance = 1 - Math.min(travel / MAX_PULL, 1) * 0.5;
      set(Math.min(travel * resistance, MAX_PULL));
      if (e.cancelable && pullRef.current > 4) e.preventDefault();
    };

    const onEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;
      const wasActive = active.current;
      active.current = false;
      if (wasActive && pullRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        set(THRESHOLD * 0.6);
        router.refresh();
        window.setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          set(0);
        }, 700);
        return;
      }
      set(0);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      aria-hidden
      className={cn(
        "fixed left-1/2 z-[1000] flex size-10 items-center justify-center rounded-full border border-border/70 bg-card shadow-lg transition-opacity duration-200",
        pull > 4 || refreshing ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      style={{
        top: `calc(env(safe-area-inset-top) + ${Math.max(pull - 44, -48)}px)`,
        transform: "translateX(-50%)",
        transition: pull === 0 ? "top 0.2s ease, opacity 0.2s ease" : "opacity 0.2s ease",
      }}
    >
      <RefreshCw
        className={cn("size-5", progress >= 1 || refreshing ? "text-[var(--gold)]" : "text-[var(--muted)]", refreshing && "animate-spin")}
        style={{ transform: refreshing ? undefined : `rotate(${progress * 180}deg)` }}
      />
    </div>
  );
}
