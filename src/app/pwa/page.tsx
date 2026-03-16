"use client";

import Link from "next/link";
import { TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import PublicSplitShell from "@/components/public/PublicSplitShell";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaEntryPage() {
  const PULL_THRESHOLD = 108;
  const MAX_PULL = 170;
  const MIN_PULL_START = 18;
  const VERTICAL_DOMINANCE = 10;

  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const pullStartY = useRef<number | null>(null);
  const pullStartX = useRef<number | null>(null);
  const isPulling = useRef(false);
  const pullActivated = useRef(false);
  const hasHapticFired = useRef(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsOnline(window.navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;

    let current: HTMLElement | null = wrapperRef.current.parentElement;
    while (current) {
      const style = window.getComputedStyle(current);
      const canScroll =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        current.scrollHeight > current.clientHeight;
      if (canScroll) {
        scrollContainerRef.current = current;
        break;
      }
      current = current.parentElement;
    }
  }, []);

  const statusTone = useMemo(
    () =>
      isOnline
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200",
    [isOnline],
  );

  async function handleInstall() {
    if (!installEvent || installing) return;
    setInstalling(true);
    setInstallMessage(null);
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallMessage(choice.outcome === "accepted" ? "App installation started." : "Install prompt dismissed.");
    setInstalling(false);
    setInstallEvent(null);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (refreshing) return;
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      isPulling.current = false;
      pullStartY.current = null;
      return;
    }
    pullStartY.current = event.touches[0].clientY;
    pullStartX.current = event.touches[0].clientX;
    isPulling.current = true;
    pullActivated.current = false;
    hasHapticFired.current = false;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!isPulling.current || pullStartY.current == null || refreshing) return;
    const currentY = event.touches[0].clientY;
    const currentX = event.touches[0].clientX;
    const delta = currentY - pullStartY.current;
    const deltaX = Math.abs(currentX - (pullStartX.current ?? currentX));

    if (delta <= 0) {
      setPullDistance(0);
      pullActivated.current = false;
      return;
    }

    if (!pullActivated.current) {
      if (delta < MIN_PULL_START) return;
      if (delta <= deltaX + VERTICAL_DOMINANCE) return;
      pullActivated.current = true;
    }

    // Dampen gesture so pull feels natural and doesn't jump too fast.
    const nextDistance = Math.min(MAX_PULL, Math.max(0, delta - MIN_PULL_START) * 0.52);
    setPullDistance(nextDistance);

    if (nextDistance >= PULL_THRESHOLD && !hasHapticFired.current) {
      hasHapticFired.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    }

    if (nextDistance > 0) {
      event.preventDefault();
    }
  }

  function handleTouchEnd() {
    if (!isPulling.current || refreshing) return;
    isPulling.current = false;
    pullStartY.current = null;
    pullStartX.current = null;

    const isActivated = pullActivated.current;
    pullActivated.current = false;
    if (!isActivated) {
      setPullDistance(0);
      hasHapticFired.current = false;
      return;
    }

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(56);
      window.setTimeout(() => {
        window.location.reload();
      }, 220);
      return;
    }

    setPullDistance(0);
    hasHapticFired.current = false;
  }

  const pullProgress = Math.min(1, pullDistance / PULL_THRESHOLD);
  const isArmed = pullDistance >= PULL_THRESHOLD;

  return (
    <PublicSplitShell
      key="pwa-shell"
      current="home"
      eyebrow="Progressive Web App"
      title="PWA Launch Hub"
      subtitle={
        <>
          Install FLC FMS for a faster, app-like experience. Keep essential screens available even during low connectivity.
        </>
      }
    >
      <div
        ref={wrapperRef}
        className="mx-auto w-full max-w-xl space-y-5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            height: pullDistance > 0 || refreshing ? 42 : 0,
            transition: "height 170ms ease",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                border: "2px solid rgba(28,48,88,0.18)",
                borderTopColor: refreshing ? "var(--gold)" : "var(--navy)",
                transform: refreshing
                  ? "rotate(0deg)"
                  : `rotate(${Math.round(pullProgress * 280)}deg) scale(${isArmed ? 1.06 : 1})`,
                transition: "transform 120ms ease, border-color 120ms ease",
                animation: refreshing ? "spin 0.8s linear infinite" : "none",
              }}
            />
            <span
              className="text-xs font-semibold tracking-wide uppercase"
              style={{
                color: isArmed ? "var(--navy)" : "var(--muted)",
                opacity: Math.max(0.6, pullProgress) || (refreshing ? 1 : 0),
                transform: `translateY(${Math.max(0, 10 - pullDistance / 9)}px)`,
                transition: "opacity 120ms ease, transform 120ms ease, color 120ms ease",
              }}
            >
              {refreshing ? "Refreshing..." : isArmed ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </div>

        <section className="card p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Progressive Web App</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            FLC FMS Mobile
          </h1>
          <p className="mt-2 text-sm text-[var(--slate)]">
            Launch faster, keep key pages cached, and continue working even when your connection is unstable.
          </p>

          <div className={`mt-4 rounded-xl border px-3 py-2 text-sm font-medium ${statusTone}`}>
            {isOnline ? "Online: Live updates available" : "Offline: Cached pages only"}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs text-[var(--muted)]">Mode</p>
              <p className="text-sm font-semibold text-[var(--navy)]">{isStandalone ? "Installed app" : "Browser tab"}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-3">
              <p className="text-xs text-[var(--muted)]">Install support</p>
              <p className="text-sm font-semibold text-[var(--navy)]">{installEvent ? "Ready" : "Use browser menu"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {installEvent ? (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="btn-gold w-full sm:w-auto"
              >
                {installing ? "Preparing install..." : "Install App"}
              </button>
            ) : (
              <button type="button" className="btn-secondary w-full sm:w-auto" disabled>
                Install via browser menu
              </button>
            )}
            <Link href="/login" className="btn-primary w-full sm:w-auto text-center">Go to Login</Link>
          </div>

          {installMessage && <p className="mt-3 text-xs text-[var(--muted)]">{installMessage}</p>}
        </section>

        <section className="card p-6 sm:p-7">
          <p className="text-sm font-semibold text-[var(--navy)]">Quick actions</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/" className="btn-secondary w-full text-center">Open Public Catalog</Link>
            <Link href="/offline" className="btn-secondary w-full text-center">View Offline Screen</Link>
          </div>
        </section>
      </div>
    </PublicSplitShell>
  );
}
