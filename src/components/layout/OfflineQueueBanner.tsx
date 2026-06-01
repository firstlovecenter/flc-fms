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
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-amber-900/10 border-b border-amber-900/20 text-amber-700 dark:text-amber-400"
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
          ? "bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
          : "bg-blue-50/80 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-[var(--navy)] dark:text-blue-300"
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
            className="rounded-md px-3 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-[var(--navy)] dark:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
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
