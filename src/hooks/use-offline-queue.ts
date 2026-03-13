"use client";

import { useCallback, useEffect, useState } from "react";

const DB_NAME = "cfms-offline";
const DB_VERSION = 1;
const STORE = "queue";

export type QueueItemType = "expense";

export interface OfflineQueueItem {
  id: string;
  type: QueueItemType;
  data: Record<string, unknown>;
  label: string;        // Human-readable summary for the banner
  createdAt: string;
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(): Promise<OfflineQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineQueueItem[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(item: OfflineQueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Load queue from IndexedDB and watch online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    dbGetAll().then(setQueue).catch(() => {});

    const handleOnline = () => {
      setIsOnline(true);
      dbGetAll().then(setQueue).catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    // When SW signals FLUSH_OFFLINE_QUEUE (triggered by Background Sync), reload queue
    const handleMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "FLUSH_OFFLINE_QUEUE") {
        dbGetAll().then(setQueue).catch(() => {});
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  /** Save a draft item to the queue. Returns the saved item. */
  const enqueue = useCallback(async (item: Omit<OfflineQueueItem, "id" | "createdAt">): Promise<OfflineQueueItem> => {
    const full: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    await dbPut(full);
    // Register a Background Sync tag so SW notifies us when connectivity returns
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync
        .register("cfms-offline-queue")
        .catch(() => {});
    }
    setQueue((prev) => [...prev, full]);
    return full;
  }, []);

  /** Remove a specific item from the queue (after successful submission). */
  const dequeue = useCallback(async (id: string) => {
    await dbDelete(id);
    setQueue((prev) => prev.filter((i) => i.id !== id));
  }, []);

  /** Wipe the entire queue. */
  const clearQueue = useCallback(async () => {
    await dbClear();
    setQueue([]);
  }, []);

  return { queue, isOnline, enqueue, dequeue, clearQueue };
}
