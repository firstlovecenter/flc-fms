"use client";

import { useCallback, useState } from "react";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { submitExpense } from "@/actions/expense.actions";
import { WifiOff, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  if (isOnline && expenseQueue.length === 0 && !syncResult) return null;

  // Offline strip
  if (!isOnline) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-warning/90 border-b border-warning/60 text-warning dark:text-warning"
      >
        <WifiOff size={13} />
        <span>You&apos;re offline. Any expense requests will be saved and submitted automatically when you reconnect.</span>
      </div>
    );
  }

  if (dismissed && !syncResult) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 px-4 py-2 text-xs font-medium flex-wrap border-b",
        syncResult
          ? "bg-success/10 dark:bg-success/90 border-success/30 dark:border-success/60 text-success dark:text-success"
          : "bg-info/10 dark:bg-info/90 border-info/30 dark:border-info/60 text-[var(--navy)] dark:text-info"
      )}
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
            className="rounded-md px-3 py-1 text-xs font-semibold bg-info/15 dark:bg-info/90 border border-info/30 dark:border-info/60 text-[var(--navy)] dark:text-info disabled:cursor-not-allowed disabled:opacity-60 hover:bg-info/25 dark:hover:bg-info/90 transition-colors"
          >
            {syncing ? "Submitting…" : "Submit now"}
          </button>
        </>
      )}

      <button
        onClick={() => { setDismissed(true); setSyncResult(null); }}
        aria-label="Dismiss"
        className="ml-auto opacity-50 hover:opacity-80 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  );
}
