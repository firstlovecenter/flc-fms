"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(window.navigator.onLine);
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[var(--cream)] flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md p-6 sm:p-7 text-center">
        <img src="/fl-logo.webp" alt="First Love Center" width={80} height={80} style={{ margin: "0 auto 20px" }} />
        <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
          You are offline
        </h1>
        <p className="mt-2 text-sm text-[var(--slate)] leading-relaxed">
          We could not reach the network. You can retry now or continue with cached pages.
        </p>

        <div className={`mt-4 rounded-xl border px-3 py-2 text-sm font-medium ${isOnline ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          {isOnline ? "Connection restored" : "No internet connection"}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          {isOnline ? (
            <Link href="/pwa" className="btn-primary w-full sm:w-auto text-center">
              Open PWA Hub
            </Link>
          ) : (
            <button onClick={() => window.location.reload()} className="btn-primary w-full sm:w-auto">
              Retry
            </button>
          )}
          <Link href="/login" className="btn-secondary w-full sm:w-auto text-center">
            Open Login
          </Link>
          <Link href="/" className="btn-secondary w-full sm:w-auto text-center">
            Open Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
