"use client";

import { useState, useTransition } from "react";
import { BookingCategory } from "@prisma/client";
import { Plus, Trash2, Calendar, Clock } from "lucide-react";
import {
  createCeremonyDay,
  deleteCeremonyDay,
  addCeremonyTimeSlot,
  deleteCeremonyTimeSlot,
  CEREMONY_CATEGORIES,
} from "@/actions/ceremony.actions";
import { formatCurrency } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  CHURCH_SERVICE: "Church Service",
  WEDDING: "Wedding",
  FUNERAL: "Funeral",
  MEETING: "Meeting",
  CONFERENCE: "Conference",
  WORKSHOP: "Workshop",
  BIRTHDAY_PARTY: "Birthday Party",
  CONCERT: "Concert",
  REHEARSAL: "Rehearsal",
  BABY_DEDICATION: "Baby Dedication",
  OTHER: "Other",
};

interface CeremonySlot {
  id: string;
  category: BookingCategory;
  startTime: string;
  endTime: string;
  label: string;
  maxBookings: number;
  pricePerHour: string | null;
  isFree: boolean;
}

interface CeremonyDayData {
  id: string;
  date: Date;
  title: string | null;
  notes: string | null;
  timeSlots: CeremonySlot[];
  createdBy: { name: string };
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function CeremonyDayManager({
  facilityId,
  initialDays,
}: {
  facilityId: string;
  initialDays: CeremonyDayData[];
}) {
  const [days, setDays] = useState(initialDays);
  const [isPending, startTransition] = useTransition();

  // Add new ceremony day form
  const [showAddDay, setShowAddDay] = useState(false);
  const [dayForm, setDayForm] = useState({ date: "", title: "" });
  const [dayError, setDayError] = useState<string | null>(null);

  // Add slot form (per ceremony day)
  const [showAddSlot, setShowAddSlot] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({
    category: "" as BookingCategory | "",
    startTime: "",
    endTime: "",
    label: "",
    maxBookings: "1",
    pricePerHour: "",
    isFree: false,
  });
  const [slotError, setSlotError] = useState<string | null>(null);

  function handleAddDay() {
    if (!dayForm.date) return;
    setDayError(null);
    startTransition(async () => {
      const result = await createCeremonyDay({
        facilityId,
        date: new Date(dayForm.date),
        title: dayForm.title || undefined,
      });
      if ("error" in result && result.error) {
        setDayError(result.error);
      } else if (result.success) {
        setDayForm({ date: "", title: "" });
        setShowAddDay(false);
        // Refresh by reloading page
        window.location.reload();
      }
    });
  }

  function handleDeleteDay(id: string) {
    if (!confirm("Delete this ceremony day and all its time slots?")) return;
    startTransition(async () => {
      await deleteCeremonyDay(id);
      setDays((prev) => prev.filter((d) => d.id !== id));
    });
  }

  function handleAddSlot(ceremonyDayId: string) {
    if (!slotForm.category || !slotForm.startTime || !slotForm.endTime || !slotForm.label) return;
    setSlotError(null);
    startTransition(async () => {
      const result = await addCeremonyTimeSlot({
        ceremonyDayId,
        category: slotForm.category as BookingCategory,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        label: slotForm.label,
        maxBookings: parseInt(slotForm.maxBookings) || 1,
        pricePerHour: slotForm.isFree ? 0 : parseFloat(slotForm.pricePerHour) || undefined,
        isFree: slotForm.isFree,
      });
      if ("error" in result && result.error) {
        setSlotError(result.error as string);
      } else {
        setSlotForm({
          category: "",
          startTime: "",
          endTime: "",
          label: "",
          maxBookings: "1",
          pricePerHour: "",
          isFree: false,
        });
        setShowAddSlot(null);
        window.location.reload();
      }
    });
  }

  function handleDeleteSlot(id: string) {
    startTransition(async () => {
      await deleteCeremonyTimeSlot(id);
      setDays((prev) =>
        prev.map((d) => ({
          ...d,
          timeSlots: d.timeSlots.filter((s) => s.id !== id),
        })),
      );
    });
  }

  return (
    <div className="space-y-6">
      {/* Add ceremony day */}
      {showAddDay ? (
        <div className="card p-5 space-y-4 border-2 border-dashed border-[var(--gold)]">
          <h3 className="font-semibold text-[var(--navy)]">New Ceremony Day</h3>
          {dayError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{dayError}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Date *</label>
              <input
                type="date"
                value={dayForm.date}
                onChange={(e) => setDayForm((f) => ({ ...f, date: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Title</label>
              <input
                value={dayForm.title}
                onChange={(e) => setDayForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Wedding & Dedication Day"
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddDay} disabled={isPending || !dayForm.date} className="btn-primary text-sm py-1.5 px-4">
              {isPending ? "Creating…" : "Create"}
            </button>
            <button onClick={() => setShowAddDay(false)} className="btn-secondary text-sm py-1.5 px-4">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddDay(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add Ceremony Day
        </button>
      )}

      {/* List ceremony days */}
      {days.length === 0 ? (
        <div className="card p-8 text-center text-[var(--muted)]">
          <Calendar size={40} className="mx-auto mb-3 opacity-40" />
          <p>No ceremony days configured yet.</p>
          <p className="text-sm mt-1">Create ceremony days with definite time slots for weddings, baby dedications, and other ceremonies.</p>
        </div>
      ) : (
        days.map((day) => (
          <div key={day.id} className="card overflow-hidden">
            {/* Day header */}
            <div className="p-5 bg-gradient-to-r from-[var(--navy)] to-[#2a4a6b] text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">
                    {new Date(day.date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {day.title && <p className="text-sm opacity-80 mt-0.5">{day.title}</p>}
                </div>
                <button
                  onClick={() => handleDeleteDay(day.id)}
                  disabled={isPending}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                  title="Delete ceremony day"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-xs opacity-60 mt-2">Created by {day.createdBy.name}</p>
            </div>

            {/* Time slots */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--slate)] uppercase tracking-wide flex items-center gap-1.5">
                  <Clock size={13} /> Time Slots
                </h4>
                <button
                  onClick={() => {
                    setShowAddSlot(showAddSlot === day.id ? null : day.id);
                    setSlotError(null);
                  }}
                  className="text-xs text-[var(--gold)] hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Add Slot
                </button>
              </div>

              {/* Add slot form inline */}
              {showAddSlot === day.id && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                  {slotError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-xs">{slotError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--slate)] mb-1">Ceremony Type *</label>
                      <select
                        value={slotForm.category}
                        onChange={(e) => setSlotForm((f) => ({ ...f, category: e.target.value as BookingCategory }))}
                        className="input text-sm"
                      >
                        <option value="">Select…</option>
                        {CEREMONY_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--slate)] mb-1">Label *</label>
                      <input
                        value={slotForm.label}
                        onChange={(e) => setSlotForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="e.g. Morning Wedding"
                        className="input text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--slate)] mb-1">Start *</label>
                      <input
                        type="time"
                        value={slotForm.startTime}
                        onChange={(e) => setSlotForm((f) => ({ ...f, startTime: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--slate)] mb-1">End *</label>
                      <input
                        type="time"
                        value={slotForm.endTime}
                        onChange={(e) => setSlotForm((f) => ({ ...f, endTime: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--slate)] mb-1">Max Bookings</label>
                      <input
                        type="number"
                        min="1"
                        value={slotForm.maxBookings}
                        onChange={(e) => setSlotForm((f) => ({ ...f, maxBookings: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--slate)] mb-1">Price/hr (GHS)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={slotForm.pricePerHour}
                        disabled={slotForm.isFree}
                        onChange={(e) => setSlotForm((f) => ({ ...f, pricePerHour: e.target.value }))}
                        className="input text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={slotForm.isFree}
                      onChange={(e) => setSlotForm((f) => ({ ...f, isFree: e.target.checked }))}
                    />
                    Free slot (no charge)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddSlot(day.id)}
                      disabled={isPending || !slotForm.category || !slotForm.startTime || !slotForm.endTime || !slotForm.label}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      {isPending ? "Adding…" : "Add Slot"}
                    </button>
                    <button onClick={() => setShowAddSlot(null)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                  </div>
                </div>
              )}

              {/* Slot list */}
              {day.timeSlots.length === 0 ? (
                <p className="text-sm text-[var(--muted)] italic">No time slots yet. Add ceremony-specific slots above.</p>
              ) : (
                <div className="space-y-2">
                  {day.timeSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
                          {CATEGORY_LABELS[slot.category] ?? slot.category}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[var(--navy)]">{slot.label}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                            {" · "}
                            Max {slot.maxBookings} booking{slot.maxBookings > 1 ? "s" : ""}
                            {" · "}
                            {slot.isFree ? (
                              <span className="text-green-600 font-medium">Free</span>
                            ) : (
                              formatCurrency(Number(slot.pricePerHour ?? 0)) + "/hr"
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        disabled={isPending}
                        className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
