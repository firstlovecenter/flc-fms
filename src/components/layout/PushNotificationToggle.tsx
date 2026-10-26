"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getOrRegisterServiceWorker() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

function getValidatedVapidKey() {
  const key = process.env.NEXT_PUBLIC_VAPID_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return null;

  try {
    // Web Push public keys are uncompressed P-256 points (65 bytes).
    const decoded = urlBase64ToUint8Array(key);
    if (decoded.length !== 65) return null;
    return key;
  } catch {
    return null;
  }
}

const ROUND =
  "flex size-10 items-center justify-center rounded-full border border-border/70 bg-card shadow-[var(--shadow-xs)] transition-colors";
const ROW =
  "flex h-9 w-full items-center gap-2.5 rounded-full px-3 text-[0.8rem] font-medium transition-colors";

/**
 * `compact` is the round icon button in the staff header; `row` is a full-width
 * row in the staff sidebar's account panel.
 */
export default function PushNotificationToggle({ compact, row }: { compact?: boolean; row?: boolean } = {}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(() => getValidatedVapidKey());

  useEffect(() => {
    if (vapidKey) return;

    let cancelled = false;

    fetch("/api/push/public-key")
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ key?: string }>;
      })
      .then((data) => {
        if (cancelled || !data?.key) return;

        try {
          const decoded = urlBase64ToUint8Array(data.key);
          if (decoded.length === 65) {
            setVapidKey(data.key);
          }
        } catch {
          // Ignore invalid server response.
        }
      })
      .catch(() => {
        // Ignore; toggle remains hidden when key is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    try {
      const reg = await getOrRegisterServiceWorker();
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (error) {
      console.error("Failed to check push subscription", error);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  async function handleToggle() {
    if (!vapidKey) return;
    setLoading(true);

    try {
      if (subscribed) {
        // Unsubscribe
        const reg = await getOrRegisterServiceWorker();
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const res = await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          if (!res.ok) {
            throw new Error(`Failed to unsubscribe: ${res.status}`);
          }
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        // Subscribe
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          setLoading(false);
          return;
        }

        const reg = await getOrRegisterServiceWorker();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        });

        const json = sub.toJSON();
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
        if (!res.ok) {
          await sub.unsubscribe();
          throw new Error(`Failed to persist subscription: ${res.status}`);
        }
        setSubscribed(true);
      }
    } catch (error) {
      console.error("Push subscription toggle failed", error);
    } finally {
      setLoading(false);
    }
  }

  // Don't render if push isn't supported or VAPID key isn't set
  if (permission === "unsupported" || !vapidKey) return null;

  // If permission was permanently denied, show disabled state
  if (permission === "denied") {
    return compact ? (
      <button
        disabled
        className={`${ROUND} text-[var(--muted)] cursor-not-allowed opacity-70`}
        title="Notifications blocked — enable in browser settings"
      >
        <BellOff size={15} strokeWidth={1.5} />
      </button>
    ) : row ? (
      <button
        disabled
        className={`${ROW} text-muted-foreground cursor-not-allowed opacity-70`}
        title="Notifications blocked — enable in browser settings"
      >
        <BellOff size={16} className="opacity-80" />
        Notifications blocked
      </button>
    ) : (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed"
        title="Notifications blocked — enable in browser settings"
      >
        <BellOff size={16} />
        <span className="hidden sm:inline">Notifications blocked</span>
      </button>
    );
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-label={subscribed ? "Disable push notifications" : "Enable push notifications"}
        className={`${ROUND} ${subscribed ? "text-[var(--gold)]" : "text-[var(--muted)] hover:text-[var(--navy)]"}`}
        title={subscribed ? "Disable push notifications" : "Enable push notifications"}
      >
        {loading ? (
          <Loader2 size={17} className="animate-spin" />
        ) : subscribed ? (
          <Bell size={17} strokeWidth={1.75} />
        ) : (
          <BellOff size={17} strokeWidth={1.75} />
        )}
      </button>
    );
  }

  if (row) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`${ROW} ${
          subscribed
            ? "text-[var(--gold)] hover:bg-[hsl(var(--sb-bg))]"
            : "text-[hsl(var(--sb-fg))] hover:bg-[hsl(var(--sb-bg))] hover:text-[hsl(var(--sb-fg-strong))]"
        }`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : subscribed ? <Bell size={16} /> : <BellOff size={16} className="opacity-80" />}
        {subscribed ? "Notifications on" : "Turn on notifications"}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        subscribed
          ? "bg-[rgba(255,66,102,0.12)] text-[var(--gold)]"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      }`}
      title={subscribed ? "Disable push notifications" : "Enable push notifications"}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : subscribed ? (
        <Bell size={16} />
      ) : (
        <BellOff size={16} />
      )}
      <span className="hidden sm:inline">
        {loading ? "..." : subscribed ? "Notifications on" : "Notifications off"}
      </span>
    </button>
  );
}
