"use client";

import { useState } from "react";
import { Wrench, X, Calendar } from "lucide-react";
import { toggleMaintenanceLock } from "@/actions/facility.actions";
import { useRouter } from "next/navigation";

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
          className="p-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 flex items-center gap-1.5"
        >
          <Wrench size={14} />
          <span className="text-xs">End Maintenance</span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          title="Set maintenance period"
          className="p-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 bg-[var(--cream)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--cream)] flex items-center gap-1.5"
        >
          <Wrench size={14} />
          <span className="text-xs">Maintenance</span>
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Wrench size={18} className="text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-[var(--navy)] text-lg leading-tight">Set Maintenance Period</h2>
                <p className="text-xs text-slate-500">Facility will be hidden from bookings during this period</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={13} /> Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={13} /> End Date <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="input w-full"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave blank for indefinite maintenance</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleLock}
                disabled={loading || !startDate}
                className="flex-1 btn-primary bg-orange-500 hover:bg-orange-600 border-orange-500 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Lock Facility"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
