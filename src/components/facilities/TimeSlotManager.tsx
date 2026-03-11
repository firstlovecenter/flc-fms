"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check, X, Clock } from "lucide-react";
import { createTimeSlot, updateTimeSlot, deleteTimeSlot } from "@/actions/facility.actions";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimeSlot {
  id:                   string;
  facilityId:           string;
  label:                string;
  dayOfWeek:            number;
  startTime:            string;
  endTime:              string;
  isFlexible:           boolean;
  isFree:               boolean;
  pricePerHourOverride: unknown | null;
  maxBookings:          number;
  category:             string | null;
  isActive:             boolean;
}

export interface CategoryOption {
  value: string;
  label: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Slot Form ────────────────────────────────────────────────────────────────

interface SlotFormState {
  label:                string;
  dayOfWeek:            number;
  startTime:            string;
  endTime:              string;
  isFlexible:           boolean;
  isFree:               boolean;
  pricePerHourOverride: string;
  maxBookings:          string;
  category:             string;
}

const emptyForm = (day: number): SlotFormState => ({
  label: "", dayOfWeek: day,
  startTime: "08:00", endTime: "10:00",
  isFlexible: false, isFree: false,
  pricePerHourOverride: "", maxBookings: "1",
  category: "",
});

function slotToForm(s: TimeSlot): SlotFormState {
  return {
    label:                s.label,
    dayOfWeek:            s.dayOfWeek,
    startTime:            s.startTime,
    endTime:              s.endTime,
    isFlexible:           s.isFlexible,
    isFree:               s.isFree,
    pricePerHourOverride: s.pricePerHourOverride != null ? String(s.pricePerHourOverride) : "",
    maxBookings:          String(s.maxBookings),
    category:             s.category ?? "",
  };
}

interface SlotFormProps {
  facilityId:    string;
  defaultDay:    number;
  initial?:      SlotFormState;
  editingSlotId?: string;
  onDone: ()  => void;
  onSaved: (slot: TimeSlot) => void;
}

function SlotForm({ facilityId, defaultDay, initial, editingSlotId, onDone, onSaved, bookingCategories }: SlotFormProps & { bookingCategories: CategoryOption[] }) {
  const [form, setForm] = useState<SlotFormState>(initial ?? emptyForm(defaultDay));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof SlotFormState>(key: K, val: SlotFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim())          { setError("Label is required"); return; }
    if (form.startTime >= form.endTime) { setError("End time must be after start time"); return; }

    const payload = {
      label:                form.label.trim(),
      dayOfWeek:            form.dayOfWeek,
      startTime:            form.startTime,
      endTime:              form.endTime,
      isFlexible:           form.isFlexible,
      isFree:               form.isFree,
      pricePerHourOverride: form.pricePerHourOverride ? Number(form.pricePerHourOverride) : null,
      maxBookings:          Number(form.maxBookings) || 1,
      category:             form.category || null,
    };

    startTransition(async () => {
      const res = editingSlotId
        ? await updateTimeSlot(editingSlotId, payload)
        : await createTimeSlot(facilityId, payload);

      if ("error" in res) {
        setError(res.error as string);
      } else {
        onSaved(res.slot as TimeSlot);
        onDone();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--cream)] border border-[var(--border)] rounded-xl p-4 space-y-3 mt-2">
      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-[var(--slate)] mb-1">Slot Label *</label>
          <input
            className="input text-sm"
            placeholder="e.g. Morning Session, 8 AM Slot"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--slate)] mb-1">Day of Week</label>
          <select
            className="input text-sm"
            value={form.dayOfWeek}
            onChange={(e) => set("dayOfWeek", Number(e.target.value))}
          >
            {DAYS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--slate)] mb-1">Category (optional)</label>
          <select
            className="input text-sm"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {[{ value: "", label: "All categories" }, ...bookingCategories].map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--slate)] mb-1">Start Time *</label>
          <input
            type="time" className="input text-sm"
            value={form.startTime}
            onChange={(e) => set("startTime", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--slate)] mb-1">End Time *</label>
          <input
            type="time" className="input text-sm"
            value={form.endTime}
            onChange={(e) => set("endTime", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--slate)] mb-1">Max Concurrent Bookings</label>
          <input
            type="number" min={1} className="input text-sm"
            value={form.maxBookings}
            onChange={(e) => set("maxBookings", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--slate)] mb-1">Price Override (₦/hr)</label>
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
          <span className="text-xs text-[var(--muted)]">(users can book any time within window)</span>
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

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending} className="btn-primary text-sm py-1.5 px-4">
          {isPending ? "Saving…" : editingSlotId ? "Update Slot" : "Add Slot"}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary text-sm py-1.5 px-4">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Single Slot Card ─────────────────────────────────────────────────────────

function SlotCard({
  slot,
  facilityId,
  onDeleted,
  onUpdated,
  bookingCategories,
}: {
  slot: TimeSlot;
  facilityId: string;
  onDeleted: (slotId: string) => void;
  onUpdated: (slot: TimeSlot) => void;
  bookingCategories: CategoryOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteTimeSlot(slot.id);
      onDeleted(slot.id);
    });
  }

  if (editing) {
    return (
      <SlotForm
        facilityId={facilityId}
        defaultDay={slot.dayOfWeek}
        initial={slotToForm(slot)}
        editingSlotId={slot.id}
        onSaved={onUpdated}
        onDone={() => setEditing(false)}
        bookingCategories={bookingCategories}
      />
    );
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white border border-[var(--border)] rounded-xl group hover:border-[var(--navy)] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 bg-brand-50 text-[var(--navy)] rounded-lg p-2">
          <Clock size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--navy)] truncate">{slot.label}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--muted)]">
              {slot.startTime} – {slot.endTime}
            </span>
            {slot.isFlexible && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">Flexible</span>
            )}
            {slot.isFree ? (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">Free</span>
            ) : slot.pricePerHourOverride != null ? (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                {formatCurrency(Number(slot.pricePerHourOverride))}/hr
              </span>
            ) : null}
            {slot.category && (
              <span className="text-xs bg-[var(--cream)] text-[var(--slate)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">
                {bookingCategories.find((c) => c.value === slot.category)?.label ?? slot.category}
              </span>
            )}
            {slot.maxBookings > 1 && (
              <span className="text-xs text-[var(--muted)]">×{slot.maxBookings} concurrent</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--navy)] transition-colors"
          title="Edit slot"
        >
          <Pencil size={13} />
        </button>
        {confirming ? (
          <>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Confirm delete"
            >
              <Check size={13} />
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)] transition-colors"
              title="Cancel"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors"
            title="Delete slot"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Day Panel ────────────────────────────────────────────────────────────────

function DayPanel({
  day,
  slots,
  facilityId,
  onUpsert,
  onDelete,
  bookingCategories,
}: {
  day: number;
  slots: TimeSlot[];
  facilityId: string;
  onUpsert: (slot: TimeSlot) => void;
  onDelete: (slotId: string) => void;
  bookingCategories: CategoryOption[];
}) {
  const [adding, setAdding]   = useState(false);

  const daySlots = slots.filter((s) => s.dayOfWeek === day);

  return (
    <div className="space-y-2">
      {daySlots.length === 0 && !adding && (
        <p className="text-sm text-[var(--muted)] py-2">No time slots configured for {DAYS[day]}.</p>
      )}
      {daySlots.map((slot) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          facilityId={facilityId}
          onDeleted={onDelete}
          onUpdated={onUpsert}
          bookingCategories={bookingCategories}
        />
      ))}
      {adding ? (
        <SlotForm
          facilityId={facilityId}
          defaultDay={day}
          onSaved={onUpsert}
          onDone={() => { setAdding(false); }}
          bookingCategories={bookingCategories}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-[var(--navy)] hover:text-[var(--gold)] transition-colors py-1"
        >
          <Plus size={15} />
          Add slot for {DAYS[day]}
        </button>
      )}
    </div>
  );
}

// ─── TimeSlotManager ──────────────────────────────────────────────────────────

export default function TimeSlotManager({
  facilityId,
  initialSlots,
  bookingCategories = [],
}: {
  facilityId:    string;
  initialSlots:  TimeSlot[];
  bookingCategories?: CategoryOption[];
}) {
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay());
  const [slots, setSlots]         = useState<TimeSlot[]>(initialSlots);

  function sortSlots(items: TimeSlot[]) {
    return [...items].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.label.localeCompare(b.label);
    });
  }

  function handleUpsert(slot: TimeSlot) {
    setSlots((prev) => {
      const exists = prev.some((s) => s.id === slot.id);
      const next = exists ? prev.map((s) => (s.id === slot.id ? slot : s)) : [...prev, slot];
      return sortSlots(next);
    });
  }

  function handleDelete(slotId: string) {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[var(--navy)]">Time Slot Configuration</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Define available booking windows. Bookers will see these options when scheduling.
          </p>
        </div>
        <span className="text-xs bg-brand-50 border border-brand-200 text-[var(--navy)] px-2.5 py-1 rounded-full font-medium">
          {slots.length} slot{slots.length !== 1 ? "s" : ""} total
        </span>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto pb-0">
        {DAYS.map((day, i) => {
          const count = slots.filter((s) => s.dayOfWeek === i).length;
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeDay === i
                  ? "border-[var(--navy)] text-[var(--navy)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--slate)]"
              }`}
            >
              {day.slice(0, 3)}
              {count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0 font-semibold ${
                  activeDay === i ? "bg-[var(--navy)] text-white" : "bg-[var(--cream)] text-[var(--slate)]"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active day slots */}
      <DayPanel
        key={activeDay}
        day={activeDay}
        slots={slots}
        facilityId={facilityId}
        onUpsert={handleUpsert}
        onDelete={handleDelete}
        bookingCategories={bookingCategories}
      />
    </div>
  );
}
