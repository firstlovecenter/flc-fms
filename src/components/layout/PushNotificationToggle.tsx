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

export default function PushNotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      // SW not ready yet
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
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
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

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        });

        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
        setSubscribed(true);
      }
    } catch {
      // Push subscription failed silently
    } finally {
      setLoading(false);
    }
  }

  // Don't render if push isn't supported or VAPID key isn't set
  if (permission === "unsupported" || !vapidKey) return null;

  // If permission was permanently denied, show disabled state
  if (permission === "denied") {
    return (
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

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        subscribed
          ? "bg-[rgba(200,163,90,0.15)] text-[var(--gold)]"
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
