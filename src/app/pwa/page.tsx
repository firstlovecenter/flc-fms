"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublicSplitShell from "@/components/public/PublicSplitShell";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaEntryPage() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

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
      <div className="mx-auto w-full max-w-xl space-y-5">
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
