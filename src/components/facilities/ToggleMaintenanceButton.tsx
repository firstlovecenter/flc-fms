"use client";

import { useState } from "react";
import { Wrench, X, Calendar } from "lucide-react";
import { toggleMaintenanceLock } from "@/actions/facility.actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ToggleMaintenanceButton({
  facilityId,
  underMaintenance,
  maintenanceStartsAt,
  maintenanceEndsAt,
}: {
  facilityId: string;
  underMaintenance: boolean;
  maintenanceStartsAt?: Date | string | null;
  maintenanceEndsAt?: Date | string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    maintenanceStartsAt ? new Date(maintenanceStartsAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(
    maintenanceEndsAt ? new Date(maintenanceEndsAt).toISOString().slice(0, 10) : ""
  );

  async function handleLock() {
    setLoading(true);
    await toggleMaintenanceLock(
      facilityId,
      true,
      startDate ? new Date(startDate) : new Date(),
      endDate ? new Date(endDate) : null,
    );
    setShowModal(false);
    router.refresh();
    setLoading(false);
  }

  async function handleUnlock() {
    setLoading(true);
    await toggleMaintenanceLock(facilityId, false);
    router.refresh();
    setLoading(false);
  }

  return (
    <>
      {underMaintenance ? (
        <button
          onClick={handleUnlock}
          disabled={loading}
          title="End maintenance period"
          className="p-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 bg-maintenance/10 text-maintenance border-maintenance/25 hover:bg-maintenance/20 flex items-center gap-1.5"
        >
          <Wrench size={14} />
          <span className="text-xs">End Maintenance</span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          title="Set maintenance period"
          className="p-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 bg-[var(--cream)] text-[var(--muted)] border-[var(--border)] hover:bg-muted/60 flex items-center gap-1.5"
        >
          <Wrench size={14} />
          <span className="text-xs">Maintenance</span>
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[1.5rem] bg-card p-6 shadow-[0_24px_64px_-24px_rgb(28_25_23/0.45)]">
            <button
              onClick={() => setShowModal(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--muted)]"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-maintenance/10 flex items-center justify-center">
                <Wrench size={18} className="text-maintenance" />
              </div>
              <div>
                <h2 className="font-medium text-[var(--navy)] text-lg leading-tight">Set Maintenance Period</h2>
                <p className="text-xs text-[var(--muted)]">Facility will be hidden from bookings during this period</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--navy)] mb-1 flex items-center gap-1.5">
                  <Calendar size={13} /> Start Date *
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--navy)] mb-1 flex items-center gap-1.5">
                  <Calendar size={13} /> End Date <span className="text-[var(--muted)] font-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full"
                />
                <p className="text-[11px] text-[var(--muted)] mt-1">Leave blank for indefinite maintenance</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLock}
                disabled={loading || !startDate}
                className="flex-1 bg-maintenance hover:bg-maintenance/90"
              >
                {loading ? "Saving…" : "Lock Facility"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
