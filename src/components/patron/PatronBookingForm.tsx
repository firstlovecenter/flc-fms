"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPatronBooking } from "@/actions/booking.actions";
import { getFacilityCategories, getFacilityAvailability } from "@/actions/availability.actions";
import { getCeremonyDatesForCategory, getCeremonySlots, CEREMONY_CATEGORIES } from "@/actions/ceremony.actions";
import { formatCurrency } from "@/lib/utils";
import { BookingCategory } from "@prisma/client";
import { DayPicker } from "react-day-picker";
import { format, addDays } from "date-fns";
import { ChevronLeft, ArrowRight, Check, Clock, Users } from "lucide-react";
import "react-day-picker/dist/style.css";

interface Facility {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  pricePerHour: unknown;
  amenities: string[];
  availableDays: number[];
}

interface CategoryOption {
  category: BookingCategory;
  pricePerHour: number;
  description: string | null;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  isFlexible: boolean;
  isFree: boolean;
  effectivePricePerHour: number;
  maxBookings: number;
  currentBookings: number;
  isAvailable: boolean;
}

const CATEGORY_LABELS: Record<BookingCategory, string> = {
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

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function PatronBookingForm({
  facilities,
  defaultFacilityId,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [facilityId, setFacilityId] = useState(defaultFacilityId ?? "");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [category, setCategory] = useState<BookingCategory | "">("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Ceremony mode state
  const [ceremonyDates, setCeremonyDates] = useState<{ id: string; date: Date; title: string | null }[]>([]);
  const [isCeremonyMode, setIsCeremonyMode] = useState(false);

  // Step 2 state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When facility changes, reset and fetch categories
  useEffect(() => {
    const f = facilities.find((x) => x.id === facilityId) ?? null;
    setSelectedFacility(f);
    setCategories([]);
    setCategory("");
    setSelectedDate(undefined);
    setSlots([]);
    setSelectedSlot(null);
    if (f) {
      getFacilityCategories(f.id).then((res) => {
        if (res.success) setCategories(res.categories);
      });
    }
  }, [facilityId, facilities]);

  // When date or category changes, fetch available slots
  useEffect(() => {
    if (!selectedDate || !facilityId) return;
    setSlotsLoading(true);
    setSelectedSlot(null);

    if (isCeremonyMode && category) {
      getCeremonySlots(facilityId, selectedDate, category as BookingCategory)
        .then((res) => setSlots((res.slots || []).map((s) => ({ ...s, isFlexible: false }))))
        .finally(() => setSlotsLoading(false));
    } else {
      getFacilityAvailability(
        facilityId,
        selectedDate,
        category ? (category as BookingCategory) : undefined
      )
        .then((res) => setSlots(res.success ? res.slots || [] : []))
        .finally(() => setSlotsLoading(false));
    }
  }, [selectedDate, facilityId, category, isCeremonyMode]);

  // Compute estimated cost from selected slot
  const estimatedCost = (() => {
    if (!selectedSlot) return null;
    if (selectedSlot.isFree) return 0;
    const [sh, sm] = selectedSlot.startTime.split(":").map(Number);
    const [eh, em] = selectedSlot.endTime.split(":").map(Number);
    const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    return hours * selectedSlot.effectivePricePerHour;
  })();

  const disabledDays = isCeremonyMode
    ? [
        { before: addDays(new Date(), 1) },
        { dayOfWeek: [1] },
        (date: Date) => {
          return !ceremonyDates.some(
            (cd) => new Date(cd.date).toDateString() === date.toDateString()
          );
        },
      ]
    : [
        { before: addDays(new Date(), 1) },
        { dayOfWeek: [1] },
        (date: Date) =>
          !!(selectedFacility && !selectedFacility.availableDays.includes(date.getDay())),
      ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFacility || !selectedDate || !selectedSlot || !title.trim()) return;
    setSubmitting(true);
    setError(null);

    const [sh, sm] = selectedSlot.startTime.split(":").map(Number);
    const [eh, em] = selectedSlot.endTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(sh, sm, 0, 0);
    const endTime = new Date(selectedDate);
    endTime.setHours(eh, em, 0, 0);

    const result = await createPatronBooking({
      facilityId: selectedFacility.id,
      category: (category || "OTHER") as BookingCategory,
      title,
      description: description || undefined,
      startTime,
      endTime,
    });

    setSubmitting(false);
    if ("error" in result && result.error) {
      setError(result.error as string);
      return;
    }
    router.push("/patron/bookings");
  }

  // ─── STEP 1: Calendly-style picker ───────────────────────────────────────
  if (step === 1) {
    return (
      <div className="card overflow-hidden">
        {/* Venue selector header */}
        <div className="px-5 py-4 border-b border-[var(--border)]" style={{ background: "var(--cream)" }}>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
            Select Venue
          </label>
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="input"
          >
            <option value="">Choose a venue…</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Service name (Calendly-style) */}
        {selectedFacility && (
          <div className="px-5 pt-5 pb-1">
            <h2 className="font-display font-bold text-[var(--navy)] text-2xl uppercase tracking-tight">
              {selectedFacility.name}
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1">Select a date and available time slot</p>
          </div>
        )}

        {/* 3-column picker */}
        {selectedFacility && (
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_260px] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">

            {/* LEFT — Calendar */}
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                Select a Date
              </p>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
                disabled={disabledDays}
                fromDate={addDays(new Date(), 1)}
                toDate={addDays(new Date(), 90)}
                modifiersStyles={{
                  selected: { background: "var(--navy)", color: "#ffffff", borderRadius: "50%" },
                  today: { color: "var(--gold)", fontWeight: "bold" },
                }}
              />
            </div>

            {/* CENTER — Time Slots */}
            <div className="p-5">
              {!selectedDate ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <Clock size={30} className="mb-3 text-[var(--muted)] opacity-25" />
                  <p className="text-sm text-[var(--muted)]">Select a date to see available times</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-4">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </p>

                  {/* Category filter */}
                  {categories.length > 0 && (
                    <div className="mb-4">
                      <select
                        value={category}
                        onChange={(e) => {
                          const val = e.target.value as BookingCategory | "";
                          setCategory(val);
                          setSelectedSlot(null);
                          if (val && CEREMONY_CATEGORIES.includes(val as BookingCategory) && facilityId) {
                            getCeremonyDatesForCategory(facilityId, val as BookingCategory).then((dates) => {
                              if (dates.length > 0) {
                                setCeremonyDates(dates);
                                setIsCeremonyMode(true);
                                setSelectedDate(undefined);
                                setSlots([]);
                              } else {
                                setCeremonyDates([]);
                                setIsCeremonyMode(false);
                              }
                            });
                          } else {
                            setCeremonyDates([]);
                            setIsCeremonyMode(false);
                          }
                        }}
                        className="input text-sm"
                      >
                        <option value="">All event types</option>
                        {categories.map((c) => (
                          <option key={c.category} value={c.category}>
                            {CATEGORY_LABELS[c.category]}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isCeremonyMode && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                      <strong>Ceremony Booking:</strong> Only dates with scheduled ceremony slots are available.
                    </div>
                  )}

                  {slotsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "#f3f4f6" }} />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-[var(--muted)]">No slots available for this day.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedSlot(isSelected ? null : slot)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150"
                            style={{
                              border: isSelected ? "2px solid var(--navy)" : "1.5px solid var(--border)",
                              background: isSelected ? "var(--navy)" : slot.isAvailable ? "#ffffff" : "#fafafa",
                              opacity: slot.isAvailable ? 1 : 0.42,
                              cursor: slot.isAvailable ? "pointer" : "not-allowed",
                            }}
                          >
                            <div className="flex items-center gap-5">
                              <span
                                className="text-sm font-semibold tabular-nums"
                                style={{ color: isSelected ? "#fff" : "var(--navy)", minWidth: 68 }}
                              >
                                {formatTime(slot.startTime)}
                              </span>
                              <span
                                className="text-xs"
                                style={{ color: isSelected ? "rgba(255,255,255,0.55)" : "var(--muted)" }}
                              >
                                {formatTime(slot.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {slot.isFree ? (
                                <span
                                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    color: isSelected ? "rgba(255,255,255,0.9)" : "#16a34a",
                                    background: isSelected ? "rgba(255,255,255,0.15)" : "rgba(34,197,94,0.12)",
                                  }}
                                >
                                  FREE
                                </span>
                              ) : (
                                <span
                                  className="text-xs"
                                  style={{ color: isSelected ? "rgba(255,255,255,0.65)" : "var(--slate)" }}
                                >
                                  {formatCurrency(slot.effectivePricePerHour)}/hr
                                </span>
                              )}
                              {isSelected && <Check size={14} color="#fff" />}
                              {!slot.isAvailable && (
                                <span className="text-xs text-[var(--muted)]">Full</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* RIGHT — Venue Details */}
            <div className="p-5" style={{ background: "#fafaf8" }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-4">
                Venue Details
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-display font-bold text-[var(--navy)] text-sm uppercase leading-snug">
                    {selectedFacility.name}
                  </h3>
                  {selectedFacility.description && (
                    <p className="text-xs text-[var(--slate)] mt-1 leading-relaxed line-clamp-4">
                      {selectedFacility.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--slate)]">
                  <Users size={12} />
                  <span>Up to {selectedFacility.capacity.toLocaleString()} guests</span>
                </div>
                {selectedFacility.amenities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] mb-1.5">Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFacility.amenities.map((a) => (
                        <span
                          key={a}
                          className="text-xs rounded-full px-2.5 py-0.5"
                          style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--navy)" }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDate && selectedSlot && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                      Selected
                    </p>
                    <p className="text-sm font-semibold text-[var(--navy)]">
                      {format(selectedDate, "MMMM d, yyyy")}
                    </p>
                    <p className="text-xs text-[var(--slate)] mt-0.5">
                      {formatTime(selectedSlot.startTime)} → {formatTime(selectedSlot.endTime)}
                    </p>
                    {estimatedCost !== null && (
                      <p className={`text-sm font-bold mt-1.5 ${estimatedCost === 0 ? "text-green-600" : "text-[var(--navy)]"}`}>
                        {estimatedCost === 0 ? "FREE" : formatCurrency(estimatedCost)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer — Continue button */}
        {selectedFacility && (
          <div className="px-5 py-3.5 border-t border-[var(--border)] flex items-center justify-between bg-white">
            <p className="text-sm text-[var(--muted)]">
              {!selectedDate
                ? "Pick a date to continue"
                : !selectedSlot
                ? "Pick a time slot"
                : `${format(selectedDate, "MMM d")} · ${formatTime(selectedSlot.startTime)}`}
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!selectedDate || !selectedSlot}
              className="btn-primary flex items-center gap-2"
              style={{ opacity: selectedDate && selectedSlot ? 1 : 0.35 }}
            >
              Next <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP 2: Booking details form ────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Summary card */}
      <div className="rounded-xl p-4 text-white" style={{ background: "var(--navy)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {selectedFacility?.name}
            </p>
            <p className="font-semibold text-white">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              {selectedSlot &&
                `${formatTime(selectedSlot.startTime)} – ${formatTime(selectedSlot.endTime)}`}
            </p>
          </div>
          {estimatedCost !== null && (
            <div className="text-right shrink-0">
              <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Estimated</p>
              <p className={`text-xl font-bold ${estimatedCost === 0 ? "text-green-400" : "text-[var(--gold)]"}`}>
                {estimatedCost === 0 ? "FREE" : formatCurrency(estimatedCost)}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Event type */}
      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Event Type *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BookingCategory | "")}
            className="input"
            required
          >
            <option value="">Select event type…</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {CATEGORY_LABELS[c.category]} — {formatCurrency(c.pricePerHour)}/hr
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Booking title */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Booking Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="e.g. Wedding Reception, Corporate Conference"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          rows={3}
          placeholder="Tell us more about your event…"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim() || (categories.length > 0 && !category)}
          className="btn-primary flex-1"
        >
          {submitting ? "Submitting…" : "Submit Booking Request"}
        </button>
      </div>
    </form>
  );
}
