"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createGuestBooking, createPatronBooking, createStaffBooking } from "@/actions/booking.actions";
import {
  getBookableFacilitiesByCategoryDate,
  getFacilityCategories,
  getFacilityAvailability,
  getPublicBookingCategories,
} from "@/actions/availability.actions";
import { formatCurrency } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import { format, addDays } from "date-fns";
import { ChevronLeft, ArrowRight, Check, Clock, Users } from "lucide-react";
import BookingTermsAndFaq from "@/components/bookings/BookingTermsAndFaq";
import ItemBookingTerms from "@/components/items/ItemBookingTerms";
import "react-day-picker/dist/style.css";

interface Facility {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  requiresBookingTerms: boolean;
  requiresItemBookingTerms: boolean;
  acUsageFee: number;
  pricePerHour: unknown;
  amenities: string[];
  availableDays: number[];
}

interface CategoryOption {
  category: string;
  price: number;
  description: string | null;
}

interface PublicCategoryOption {
  slug: string;
  name: string;
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

function formatCategoryLabel(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

type BookingMode = "guest" | "patron" | "staff";

export default function GuestBookingForm({
  facilities,
  defaultFacilityId,
  mode = "guest",
  currentUserRole,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
  mode?: BookingMode;
  currentUserRole?: string;
}) {
  const router = useRouter();
  const [bookingMode, setBookingMode] = useState<"facility-first" | "category-first">("facility-first");
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state — Calendly picker
  const [facilityId, setFacilityId] = useState(defaultFacilityId ?? "");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [publicCategories, setPublicCategories] = useState<PublicCategoryOption[]>([]);
  const [bookableFacilities, setBookableFacilities] = useState<Facility[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [category, setCategory] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [useAirConditioner, setUseAirConditioner] = useState(false);
  const canBookMondays =
    mode === "staff" && ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(currentUserRole ?? "");

  const bypassLeadTime = canBookMondays;


  // Step 2 state — guest info + booking details
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requiresBookingTerms = Boolean(selectedFacility?.requiresBookingTerms);
  const requiresItemTerms = Boolean(selectedFacility?.requiresItemBookingTerms);
  const requiredTerms = [
    ...(requiresBookingTerms ? (["BOOKING_TERMS"] as const) : []),
    ...(requiresItemTerms ? (["ITEM_BOOKING_TERMS"] as const) : []),
  ];
  const termsRequired = requiredTerms.length > 0;

  useEffect(() => {
    getPublicBookingCategories().then((res) => {
      if (res.success) setPublicCategories(res.categories);
    });
  }, []);

  useEffect(() => {
    setFacilityId(defaultFacilityId ?? "");
    setSelectedFacility(defaultFacilityId ? facilities.find((f) => f.id === defaultFacilityId) ?? null : null);
    setCategories([]);
    setCategory("");
    setSelectedDate(undefined);
    setSlots([]);
    setSelectedSlot(null);
    setBookableFacilities([]);
  }, [bookingMode, defaultFacilityId, facilities]);

  // When facility changes, reset and fetch categories
  useEffect(() => {
    const f = facilities.find((x) => x.id === facilityId) ?? null;
    setSelectedFacility(f);
    setCategories([]);
    if (bookingMode === "facility-first") {
      setSelectedDate(undefined);
    }
    setSlots([]);
    setSelectedSlot(null);
    if (f) {
      getFacilityCategories(f.id).then((res) => {
        if (res.success) {
          setCategories(res.categories);
          if (bookingMode === "facility-first") {
            setCategory("");
          } else if (!res.categories.some((c) => c.category === category)) {
            setCategory("");
          }
        }
      });
    } else if (bookingMode === "facility-first") {
      setCategory("");
    }
  }, [facilityId, facilities, bookingMode, category]);

  useEffect(() => {
    if (bookingMode !== "category-first" || !category || !selectedDate) {
      setBookableFacilities([]);
      return;
    }

    getBookableFacilitiesByCategoryDate(category, selectedDate, {
      allowMonday: canBookMondays,
      leadTimeHours: bypassLeadTime ? 0 : 18,
    }).then((res) => {
      if (res.success) {
        setBookableFacilities((res.facilities || []).map((f) => ({
          ...f,
          pricePerHour: f.price,
          acUsageFee: f.acUsageFee ?? 0,
        })));
      } else {
        setBookableFacilities([]);
      }
    });
  }, [bookingMode, category, selectedDate, canBookMondays, bypassLeadTime]);

  // When date or category changes, fetch available slots
  useEffect(() => {
    if (!selectedDate || !facilityId || !category) return;
    setSlotsLoading(true);
    setSelectedSlot(null);

    getFacilityAvailability(
      facilityId,
      selectedDate,
      category,
      {
        allowMonday: canBookMondays,
        leadTimeHours: bypassLeadTime ? 0 : 18,
      }
    )
      .then((res) => setSlots(res.success ? res.slots || [] : []))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, facilityId, category, canBookMondays, bypassLeadTime]);

  // Compute estimated cost from selected slot
  const estimatedCost = (() => {
    if (!selectedSlot) return null;
    const base = selectedSlot.isFree ? 0 : selectedSlot.effectivePricePerHour;
    const ac = useAirConditioner ? Number(selectedFacility?.acUsageFee ?? 0) : 0;
    return base + ac;
  })();

  const disabledDays = [
    () => !category,
    { before: addDays(new Date(), 1) },
    ...(canBookMondays ? [] : [{ dayOfWeek: [1] }]),
    (date: Date) =>
      !!(selectedFacility && !selectedFacility.availableDays.includes(date.getDay())),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFacility || !selectedDate || !selectedSlot || !title.trim()) return;
    if (mode === "guest" && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim())) return;
    if (termsRequired && !agreedToTerms) {
      setError("Please agree to the required terms before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const [sh, sm] = selectedSlot.startTime.split(":").map(Number);
    const [eh, em] = selectedSlot.endTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(sh, sm, 0, 0);
    const endTime = new Date(selectedDate);
    endTime.setHours(eh, em, 0, 0);

    const bookingPayload = {
      facilityId: selectedFacility.id,
      category: category as any,
      title,
      description: description || undefined,
      startTime,
      endTime,
      useAirConditioner,
      acceptedTerms: agreedToTerms ? requiredTerms : [],
    };

    const result =
      mode === "guest"
        ? await createGuestBooking({
            ...bookingPayload,
            guestName,
            guestEmail,
            guestPhone,
          })
        : mode === "patron"
          ? await createPatronBooking(bookingPayload)
          : await createStaffBooking(bookingPayload);

    setSubmitting(false);
    if ("error" in result && result.error) {
      setError(result.error as string);
      return;
    }

    if (mode === "guest") {
      setSuccessMessage("Booking request submitted successfully! You can create a patron account to track status and payment.");
      return;
    }

    router.push(mode === "patron" ? "/patron/bookings" : "/bookings");
    router.refresh();
  }

  if (successMessage) {
    return (
      <div className="card p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center bg-green-500/12 dark:bg-green-500/20">
          <Check size={28} className="text-green-600" />
        </div>
        <h2 className="font-display font-bold text-[var(--navy)] dark:text-gray-100 text-xl">Booking Submitted!</h2>
        <p className="text-sm text-[var(--slate)] dark:text-gray-300">{successMessage}</p>
      </div>
    );
  }

  // ─── STEP 1: Calendly-style picker ───────────────────────────────────────
  if (step === 1) {
    return (
      <div className="card overflow-hidden">
        {/* Booking mode + selectors */}
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--cream)] dark:bg-[rgba(15,26,43,0.4)]">
          <div className="mb-3 inline-flex rounded-lg border border-[var(--border)] bg-white p-1">
            <button
              type="button"
              onClick={() => setBookingMode("facility-first")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                bookingMode === "facility-first" ? "bg-[var(--navy)] text-white" : "text-[var(--slate)]"
              }`}
            >
              Venue -&gt; Category
            </button>
            <button
              type="button"
              onClick={() => setBookingMode("category-first")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                bookingMode === "category-first" ? "bg-[var(--navy)] text-white" : "text-[var(--slate)]"
              }`}
            >
              Category -&gt; Venue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-2">
                Event Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  setSelectedSlot(null);
                  setSelectedDate(undefined);
                  setSlots([]);
                }}
                className="input"
              >
                <option value="">Select event type...</option>
                {bookingMode === "facility-first"
                  ? categories.map((c) => (
                      <option key={c.category} value={c.category}>
                        {formatCategoryLabel(c.category)}
                      </option>
                    ))
                  : publicCategories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-2">
                Select Venue
              </label>
              <select
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="input"
                disabled={bookingMode === "category-first" && (!category || !selectedDate)}
              >
                <option value="">Choose a venue...</option>
                {(bookingMode === "category-first" ? bookableFacilities : facilities).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Service name (Calendly-style) */}
        {selectedFacility && (
          <div className="px-5 pt-5 pb-1">
            <h2 className="font-display font-bold text-[var(--navy)] dark:text-gray-100 text-2xl uppercase tracking-tight">
              {selectedFacility.name}
            </h2>
            <p className="text-sm text-[var(--muted)] dark:text-gray-400 mt-1">Select a date and available time slot</p>
          </div>
        )}

        {/* 3-column picker */}
        {(selectedFacility || category) && (
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_260px] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">

            {/* LEFT — Calendar */}
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-3">
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
              {!category ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <Clock size={30} className="mb-3 text-[var(--muted)] dark:text-gray-400 opacity-25" />
                  <p className="text-sm text-[var(--muted)] dark:text-gray-400">Select an event category first</p>
                </div>
              ) : !selectedFacility ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <Clock size={30} className="mb-3 text-[var(--muted)] dark:text-gray-400 opacity-25" />
                  <p className="text-sm text-[var(--muted)] dark:text-gray-400">Select a venue to load available slots</p>
                </div>
              ) : !selectedDate ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <Clock size={30} className="mb-3 text-[var(--muted)] dark:text-gray-400 opacity-25" />
                  <p className="text-sm text-[var(--muted)] dark:text-gray-400">Select a date to see available times</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-4">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </p>

                  {slotsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 rounded-xl animate-pulse bg-[#f3f4f6] dark:bg-[rgba(255,255,255,0.05)]" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-[var(--muted)] dark:text-gray-400">No slots available for this day.</p>
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
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 border-2 ${
                              isSelected 
                                ? "bg-[var(--navy)] dark:bg-[rgba(15,26,43,0.8)] border-[var(--navy)] dark:border-white" 
                                : slot.isAvailable 
                                ? "bg-white dark:bg-[rgba(15,26,43,0.4)] border-transparent dark:border-[rgba(255,255,255,0.1)] hover:border-gray-200 dark:hover:border-[rgba(255,255,255,0.2)]" 
                                : "bg-gray-50 dark:bg-[rgba(15,26,43,0.2)] border-transparent text-gray-400 dark:text-gray-500"
                            }`}
                            style={{
                              opacity: slot.isAvailable ? 1 : 0.42,
                              cursor: slot.isAvailable ? "pointer" : "not-allowed",
                            }}
                          >
                            <div className="flex items-center gap-2 sm:gap-5">
                              <span
                                className={`text-sm font-semibold tabular-nums min-w-[58px] sm:min-w-[68px] ${isSelected ? "text-white" : "text-[var(--navy)] dark:text-gray-100"}`}
                              >
                                {formatTime(slot.startTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {slot.isFree ? (
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-white/15 text-white/90" : "bg-green-500/12 text-green-600 dark:bg-[rgba(34,197,94,0.2)] dark:text-green-400"}`}
                                >
                                  FREE
                                </span>
                              ) : (
                                <span
                                  className={`text-xs ${isSelected ? "text-white/65" : "text-[var(--slate)] dark:text-gray-400"}`}
                                >
                                  {formatCurrency(slot.effectivePricePerHour)}
                                </span>
                              )}
                              {isSelected && <Check size={14} color="#fff" />}
                              {!slot.isAvailable && (
                                <span className="text-xs text-[var(--muted)] dark:text-gray-400">Full</span>
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
            <div className="p-5 bg-[#fafaf8] dark:bg-[rgba(15,26,43,0.4)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-4">
                Venue Details
              </p>
              {!selectedFacility ? (
                <p className="text-sm text-[var(--muted)] dark:text-gray-400">Select a venue to see details and finalize slot selection.</p>
              ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display font-bold text-[var(--navy)] dark:text-gray-100 text-sm uppercase leading-snug">
                    {selectedFacility.name}
                  </h3>
                  {selectedFacility.description && (
                    <p className="text-xs text-[var(--slate)] dark:text-gray-300 mt-1 leading-relaxed line-clamp-4">
                      {selectedFacility.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--slate)] dark:text-gray-300">
                  <Users size={12} />
                  <span>Up to {selectedFacility.capacity.toLocaleString()} guests</span>
                </div>
                {selectedFacility.amenities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] dark:text-gray-400 mb-1.5">Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFacility.amenities.map((a) => (
                        <span
                          key={a}
                          className="text-xs rounded-full px-2.5 py-0.5 bg-white dark:bg-[rgba(15,26,43,0.4)] border border-[var(--border)] dark:border-[rgba(255,255,255,0.1)] text-[var(--navy)] dark:text-gray-200"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDate && selectedSlot && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-2">
                      Selected
                    </p>
                    <p className="text-sm font-semibold text-[var(--navy)] dark:text-gray-100">
                      {format(selectedDate, "MMMM d, yyyy")}
                    </p>
                    <p className="text-xs text-[var(--slate)] dark:text-gray-300 mt-0.5">
                      Starts at {formatTime(selectedSlot.startTime)}
                    </p>
                    {estimatedCost !== null && (
                      <p className={`text-sm font-bold mt-1.5 ${estimatedCost === 0 ? "text-green-600" : "text-[var(--navy)] dark:text-gray-100"}`}>
                        {estimatedCost === 0 ? "FREE" : formatCurrency(estimatedCost)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Footer — Continue button */}
        {selectedFacility && (
          <div className="px-5 py-3.5 border-t border-[var(--border)] dark:border-[rgba(255,255,255,0.1)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-transparent">
            <p className="text-sm text-[var(--muted)] dark:text-gray-400">
              {!category
                ? "Pick an event category"
                : !selectedFacility
                ? "Pick a venue"
                : !selectedDate
                ? "Pick a date to continue"
                : !selectedSlot
                ? "Pick a time slot"
                : `${format(selectedDate, "MMM d")} · ${formatTime(selectedSlot.startTime)}`}
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!category || !selectedFacility || !selectedDate || !selectedSlot}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
              style={{ opacity: category && selectedFacility && selectedDate && selectedSlot ? 1 : 0.35 }}
            >
              Next <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP 2: Guest info + Booking details ────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Summary card */}
      <div className="rounded-xl p-4 text-white bg-[var(--navy)] dark:bg-[rgba(15,26,43,0.8)] border border-transparent dark:border-[rgba(255,255,255,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-white/50">
              {selectedFacility?.name}
            </p>
            <p className="font-semibold text-white">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-sm mt-0.5 text-white/65">
              {selectedSlot &&
                `Starts at ${formatTime(selectedSlot.startTime)}`}
            </p>
          </div>
          {estimatedCost !== null && (
            <div className="text-right shrink-0">
              <p className="text-xs mb-0.5 text-white/50">Estimated</p>
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

      {/* Guest information */}
      {mode === "guest" && (
        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400">Guest Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Full Name *</label>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Email *</label>
              <input
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                type="email"
                className="input"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Phone *</label>
            <input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="input"
              placeholder="0201234567"
              required
            />
          </div>
        </div>
      )}

      {/* Event type */}
      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Event Type *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
            required
          >
            <option value="">Select event type…</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {formatCategoryLabel(c.category)} — {formatCurrency(c.price)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Booking title */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Booking Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="e.g. Wedding Reception, Corporate Conference"
          required
        />
      </div>

      {selectedFacility && Number(selectedFacility.acUsageFee ?? 0) > 0 && (
        <div className="card p-4">
          <label className="flex items-start gap-3 text-sm text-[var(--slate)] dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useAirConditioner}
              onChange={(e) => setUseAirConditioner(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--border)]"
            />
            <span>
              Add air conditioner usage for this booking (+{formatCurrency(Number(selectedFacility.acUsageFee))}).
            </span>
          </label>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          rows={3}
          placeholder="Tell us more about your event…"
        />
      </div>

      {requiresBookingTerms && <BookingTermsAndFaq title="Booking Terms and Conditions" />}
      {requiresItemTerms && <ItemBookingTerms />}

      {termsRequired && (
        <label className="flex items-start gap-2 text-sm text-[var(--slate)] dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--border)]"
            required
          />
          <span>
            I have read, understood, and agree to the required terms for this booking.
          </span>
        </label>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="submit"
          disabled={
            submitting ||
            !title.trim() ||
            (mode === "guest" && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim())) ||
            (categories.length > 0 && !category) ||
            (termsRequired && !agreedToTerms)
          }
          className="btn-primary w-full sm:flex-1"
        >
          {submitting ? "Submitting…" : mode === "guest" ? "Submit Booking Request" : "Create Booking"}
        </button>
      </div>
    </form>
  );
}
