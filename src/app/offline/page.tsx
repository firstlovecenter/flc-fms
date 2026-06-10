"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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
      <Card className="w-full max-w-md p-6 sm:p-7 text-center">
        <img src="/fl-logo.webp" alt="First Love Center" width={80} height={80} className="mx-auto mb-5 block" />
        <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
          You are offline
        </h1>
        <p className="mt-2 text-sm text-[var(--slate)] leading-relaxed">
          We could not reach the network. You can retry now or continue with cached pages.
        </p>

        <div className={`mt-4 rounded-xl border px-3 py-2 text-sm font-medium ${isOnline ? "bg-success/10 border-success/25 text-success" : "bg-warning/10 border-warning/25 text-warning"}`}>
          {isOnline ? "Connection restored" : "No internet connection"}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          {isOnline ? (
            <Link href="/pwa" className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}>
              Open PWA Hub
            </Link>
          ) : (
            <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
              Retry
            </Button>
          )}
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
            Open Login
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
            Open Catalog
          </Link>
        </div>
      </Card>
    </div>
  );
}
