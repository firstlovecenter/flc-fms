"use client";

import { useCallback, useState } from "react";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { submitExpense } from "@/actions/expense.actions";
import { WifiOff, UploadCloud, X } from "lucide-react";

/**
 * Shown in the staff shell.
 * - When offline: displays an amber "You're offline" strip.
 * - When online and queue has items: shows a blue banner with a "Submit now" button
 *   that replays saved drafts through their respective server actions.
 */
export default function OfflineQueueBanner() {
  const { queue, isOnline, dequeue } = useOfflineQueue();
  const [syncing, setSyncing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const expenseQueue = queue.filter((i) => i.type === "expense");

  const handleSync = useCallback(async () => {
    if (syncing || expenseQueue.length === 0) return;
    setSyncing(true);
    setSyncResult(null);
    let successCount = 0;
    let failCount = 0;

    for (const item of expenseQueue) {
      try {
        const result = await submitExpense(item.data as Parameters<typeof submitExpense>[0]);
        if ("error" in result && result.error) {
          failCount++;
        } else {
          await dequeue(item.id);
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSyncing(false);
    if (successCount > 0 && failCount === 0) {
      setSyncResult(`${successCount} expense request${successCount > 1 ? "s" : ""} submitted successfully.`);
      setDismissed(false);
    } else if (failCount > 0) {
      setSyncResult(`${successCount} submitted, ${failCount} failed — check your connection and try again.`);
    }
  }, [syncing, expenseQueue, dequeue]);

  // Nothing to show when online, queue empty, and not syncing
  if (isOnline && expenseQueue.length === 0 && !syncResult) return null;

  // Offline strip
  if (!isOnline) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium"
        style={{
          background: "rgba(180,83,9,0.10)",
          borderBottom: "1px solid rgba(180,83,9,0.20)",
          color: "var(--amber, #b45309)",
        }}
      >
        <WifiOff size={13} />
        <span>You&apos;re offline. Any expense requests will be saved and submitted automatically when you reconnect.</span>
      </div>
    );
  }

  // Online + pending queue (or sync result shown)
  if (dismissed && !syncResult) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 px-4 py-2 text-xs font-medium flex-wrap"
      style={{
        background: syncResult
          ? "rgba(16,185,129,0.08)"
          : "rgba(37,99,235,0.08)",
        borderBottom: syncResult
          ? "1px solid rgba(16,185,129,0.20)"
          : "1px solid rgba(37,99,235,0.18)",
        color: syncResult ? "var(--emerald, #059669)" : "var(--navy, #1c3058)",
      }}
    >
      <UploadCloud size={13} />

      {syncResult ? (
        <span className="flex-1">{syncResult}</span>
      ) : (
        <>
          <span className="flex-1">
            {expenseQueue.length} pending expense request{expenseQueue.length > 1 ? "s" : ""} saved offline.
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md px-3 py-1 text-xs font-semibold"
            style={{
              background: "rgba(37,99,235,0.12)",
              border: "1px solid rgba(37,99,235,0.25)",
              color: "var(--navy, #1c3058)",
              cursor: syncing ? "not-allowed" : "pointer",
            }}
          >
            {syncing ? "Submitting…" : "Submit now"}
          </button>
        </>
      )}

      <button
        onClick={() => {
          setDismissed(true);
          setSyncResult(null);
        }}
        aria-label="Dismiss"
        className="ml-auto"
        style={{ color: "inherit", opacity: 0.5 }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
