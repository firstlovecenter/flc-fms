"use client";

import { useState, useTransition } from "react";
import { Copy, Layers, CheckCircle, AlertTriangle, Check } from "lucide-react";
import { bulkCreateTimeSlots, copyTimeSlotsToFacilities } from "@/actions/facility.actions";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FacilityOption {
  id: string;
  name: string;
  slotCount: number;
  categories: string[]; // mapped category slugs
}

export interface CategoryOption {
  value: string;
  label: string;
}

type Tab = "define" | "copy";

interface BulkResult {
  created: { facilityId: string; facilityName: string }[];
  skipped: { facilityId: string; facilityName: string; reason: string; slotLabel?: string }[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Facility Checklist ───────────────────────────────────────────────────────

function FacilityChecklist({
  facilities,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  excludeId,
  filterCategory,
}: {
  facilities: FacilityOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  excludeId?: string;
  filterCategory?: string;
}) {
  const filtered = facilities.filter((f) => {
    if (excludeId && f.id === excludeId) return false;
    if (filterCategory && !f.categories.includes(filterCategory)) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--slate)]">
          {selected.size} of {filtered.length} selected
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className="text-xs text-[var(--navy)] hover:underline">
            Select all
          </button>
          <button type="button" onClick={onClearAll} className="text-xs text-[var(--muted)] hover:underline">
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--muted)] p-3">
            {filterCategory ? "No facilities have this category mapped." : "No facilities available."}
          </p>
        )}
        {filtered.map((f) => (
          <label
            key={f.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--cream)] cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border)]"
              checked={selected.has(f.id)}
              onChange={() => onToggle(f.id)}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--navy)]">{f.name}</span>
              <span className="text-xs text-[var(--muted)] ml-2">{f.slotCount} slots</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Result Summary ───────────────────────────────────────────────────────────

function ResultSummary({ result, onDismiss }: { result: BulkResult; onDismiss: () => void }) {
  return (
    <div className="space-y-3 bg-[var(--cream)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--navy)]">Results</h3>
        <button onClick={onDismiss} className="text-xs text-[var(--muted)] hover:underline">
          Dismiss
        </button>
      </div>

      {result.created.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle size={14} />
            <span className="text-sm font-medium">
              Created {result.created.length} slot{result.created.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="text-xs text-[var(--slate)] ml-6 space-y-0.5">
            {result.created.map((c, i) => (
              <li key={i}>{c.facilityName}</li>
            ))}
          </ul>
        </div>
      )}

      {result.skipped.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={14} />
            <span className="text-sm font-medium">
              Skipped {result.skipped.length} slot{result.skipped.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="text-xs text-[var(--slate)] ml-6 space-y-0.5">
            {result.skipped.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.facilityName}</span>
                {s.slotLabel && s.slotLabel !== "(all)" && (
                  <span className="text-[var(--muted)]"> — {s.slotLabel}</span>
                )}
                : {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Define & Apply Tab ───────────────────────────────────────────────────────

function DefineAndApplyTab({
  facilities,
  bookingCategories,
}: {
  facilities: FacilityOption[];
  bookingCategories: CategoryOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    label: "",
    dayOfWeek: 0,
    startTime: "08:00",
    endTime: "10:00",
    isFlexible: false,
    isFree: false,
    pricePerHourOverride: "",
    maxBookings: "1",
    category: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const eligible = facilities.filter((f) => !form.category || f.categories.includes(form.category));
    setSelected(new Set(eligible.map((f) => f.id)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (selected.size === 0) { setError("Select at least one facility"); return; }
    if (!form.label.trim()) { setError("Label is required"); return; }
    if (!form.category) { setError("Category is required"); return; }
    if (form.startTime === form.endTime) { setError("Start and end time cannot be the same"); return; }

    const payload = {
      label: form.label.trim(),
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      isFlexible: form.isFlexible,
      isFree: form.isFree,
      pricePerHourOverride: form.pricePerHourOverride ? Number(form.pricePerHourOverride) : null,
      maxBookings: Number(form.maxBookings) || 1,
      category: form.category,
    };

    startTransition(async () => {
      const res = await bulkCreateTimeSlots(Array.from(selected), payload);
      if ("error" in res && res.error) {
        setError(res.error as string);
      } else if ("created" in res) {
        setResult({ created: res.created!, skipped: res.skipped! });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
      )}

      {result && <ResultSummary result={result} onDismiss={() => setResult(null)} />}

      {/* Slot definition */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--navy)]">Slot Definition</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[var(--slate)] mb-1">Slot Label *</label>
            <input
              className="input text-sm"
              placeholder="e.g. Morning Session"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--slate)] mb-1">Day of Week</label>
            <select className="input text-sm" value={form.dayOfWeek} onChange={(e) => set("dayOfWeek", Number(e.target.value))}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--slate)] mb-1">Category *</label>
            <select className="input text-sm" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select category...</option>
              {bookingCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--slate)] mb-1">Start Time *</label>
            <input type="time" className="input text-sm" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--slate)] mb-1">End Time *</label>
            <input type="time" className="input text-sm" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--slate)] mb-1">Max Concurrent Bookings</label>
            <input type="number" min={1} className="input text-sm" value={form.maxBookings} onChange={(e) => set("maxBookings", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--slate)] mb-1">Price Override (/hr)</label>
            <input
              type="number" min={0} step={0.01} className="input text-sm"
              placeholder="Leave blank to use venue rate"
              value={form.pricePerHourOverride}
              onChange={(e) => set("pricePerHourOverride", e.target.value)}
              disabled={form.isFree}
            />
          </div>
        </div>
        <div className="flex gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox" className="h-4 w-4 rounded border-[var(--border)]"
              checked={form.isFlexible}
              onChange={(e) => set("isFlexible", e.target.checked)}
            />
            <span className="text-[var(--slate)]">Flexible time</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox" className="h-4 w-4 rounded border-[var(--border)]"
              checked={form.isFree}
              onChange={(e) => { set("isFree", e.target.checked); if (e.target.checked) set("pricePerHourOverride", ""); }}
            />
            <span className="text-[var(--slate)]">Free slot</span>
          </label>
        </div>
      </div>

      {/* Facility selection */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--navy)]">Apply to Facilities</h3>
        {form.category && (
          <p className="text-xs text-[var(--muted)]">
            Showing facilities with category &quot;{bookingCategories.find((c) => c.value === form.category)?.label ?? form.category}&quot; mapped.
          </p>
        )}
        <FacilityChecklist
          facilities={facilities}
          selected={selected}
          onToggle={toggle}
          onSelectAll={selectAll}
          onClearAll={() => setSelected(new Set())}
          filterCategory={form.category || undefined}
        />
      </div>

      <button type="submit" disabled={isPending || selected.size === 0} className="btn-primary text-sm">
        {isPending ? "Creating…" : `Create Slot for ${selected.size} Facilit${selected.size === 1 ? "y" : "ies"}`}
      </button>
    </form>
  );
}

// ─── Copy From Venue Tab ──────────────────────────────────────────────────────

function CopyFromVenueTab({
  facilities,
}: {
  facilities: FacilityOption[];
}) {
  const [sourceId, setSourceId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(facilities.filter((f) => f.id !== sourceId).map((f) => f.id)));
  }

  const sourceFacility = facilities.find((f) => f.id === sourceId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!sourceId) { setError("Select a source facility"); return; }
    if (selected.size === 0) { setError("Select at least one target facility"); return; }

    startTransition(async () => {
      const res = await copyTimeSlotsToFacilities(sourceId, Array.from(selected));
      if ("error" in res && res.error) {
        setError(res.error as string);
      } else if ("created" in res) {
        setResult({
          created: res.created!,
          skipped: res.skipped!.map((s) => ({ ...s, slotLabel: ("slotLabel" in s ? s.slotLabel : undefined) as string | undefined })),
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
      )}

      {result && <ResultSummary result={result} onDismiss={() => setResult(null)} />}

      {/* Source facility */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--navy)]">Source Facility</h3>
        <p className="text-xs text-[var(--muted)]">All active time slots from this facility will be copied to selected targets.</p>
        <select
          className="input text-sm"
          value={sourceId}
          onChange={(e) => {
            setSourceId(e.target.value);
            setSelected((prev) => { const next = new Set(prev); next.delete(e.target.value); return next; });
          }}
        >
          <option value="">Select source facility...</option>
          {facilities.filter((f) => f.slotCount > 0).map((f) => (
            <option key={f.id} value={f.id}>{f.name} ({f.slotCount} slots)</option>
          ))}
        </select>
        {sourceFacility && (
          <p className="text-xs text-[var(--slate)]">
            {sourceFacility.slotCount} active slot{sourceFacility.slotCount !== 1 ? "s" : ""} will be copied.
          </p>
        )}
      </div>

      {/* Target facilities */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--navy)]">Target Facilities</h3>
        <FacilityChecklist
          facilities={facilities}
          selected={selected}
          onToggle={toggle}
          onSelectAll={selectAll}
          onClearAll={() => setSelected(new Set())}
          excludeId={sourceId || undefined}
        />
      </div>

      <button type="submit" disabled={isPending || !sourceId || selected.size === 0} className="btn-primary text-sm">
        {isPending ? "Copying…" : `Copy Slots to ${selected.size} Facilit${selected.size === 1 ? "y" : "ies"}`}
      </button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkSlotClient({
  facilities,
  bookingCategories,
}: {
  facilities: FacilityOption[];
  bookingCategories: CategoryOption[];
}) {
  const [tab, setTab] = useState<Tab>("define");

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("define")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "define"
              ? "border-[var(--navy)] text-[var(--navy)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--slate)]"
          }`}
        >
          <Layers size={15} />
          Define &amp; Apply
        </button>
        <button
          onClick={() => setTab("copy")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "copy"
              ? "border-[var(--navy)] text-[var(--navy)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--slate)]"
          }`}
        >
          <Copy size={15} />
          Copy from Venue
        </button>
      </div>

      {tab === "define" ? (
        <DefineAndApplyTab facilities={facilities} bookingCategories={bookingCategories} />
      ) : (
        <CopyFromVenueTab facilities={facilities} />
      )}
    </div>
  );
}
