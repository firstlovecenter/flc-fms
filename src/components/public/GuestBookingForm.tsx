"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createGuestBooking, createPatronBooking, createStaffBooking } from "@/actions/booking.actions";
import {
  getBookableFacilitiesByCategoryDate,
  getFacilityCategories,
  getFacilityAvailability,
  getCeremonyAvailability,
  getPublicBookingCategories,
} from "@/actions/availability.actions";
import { getCeremonyBookableFacilities, getCeremonyDays } from "@/actions/ceremony-venue.actions";
import { getActiveBishops } from "@/actions/bishop.actions";
import { validateCeremonyCode } from "@/actions/ceremony-code.actions";
import { formatCurrency } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import { format, addDays } from "date-fns";
import { ChevronLeft, ArrowRight, Check, Clock, Users, CalendarDays, Heart, Baby, Info } from "lucide-react";
import BookingTermsAndFaq from "@/components/bookings/BookingTermsAndFaq";
import ItemBookingTerms from "@/components/items/ItemBookingTerms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toDateStr } from "@/lib/ceremony-utils";
import { isOvernight } from "@/lib/time-utils";
import { MAX_BOOKING_ADVANCE_DAYS, MAX_CEREMONY_BOOKING_ADVANCE_DAYS } from "@/lib/booking-window";
import { Card } from "@/components/ui/card";
import ContactOfficeLink from "@/components/public/ContactOfficeLink";

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
  availableFrom?: string;
  availableTo?: string;
  flatPrice?: number;
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

type BookingMode = "guest" | "patron" | "staff";
type BookingType = "regular" | "wedding" | "naming";

/** Sentinel select value for a Bishop who isn't on the admin-managed list. */
const OTHER_BISHOP = "OTHER";

type BishopOption = { id: string; name: string; phone: string };

/**
 * Officiating Bishop picker — the admin-managed list plus an "Other" escape hatch
 * where the requester types the Bishop's own name and number. Shared by the wedding
 * and naming ceremony sections (`compact` matches the naming section's tighter type).
 */
function BishopPicker({
  bishops,
  bishopId,
  onBishopIdChange,
  customName,
  onCustomNameChange,
  customPhone,
  onCustomPhoneChange,
  compact = false,
}: {
  bishops: BishopOption[];
  bishopId: string;
  onBishopIdChange: (value: string) => void;
  customName: string;
  onCustomNameChange: (value: string) => void;
  customPhone: string;
  onCustomPhoneChange: (value: string) => void;
  compact?: boolean;
}) {
  const selectedBishop = bishops.find((b) => b.id === bishopId) ?? null;
  const isOther = bishopId === OTHER_BISHOP;
  const labelClass = compact
    ? "block text-xs font-medium text-[var(--muted)] mb-1"
    : "block text-sm font-medium text-[var(--slate)] mb-1";
  const inputClass = compact ? "text-sm" : undefined;

  return (
    <>
      <div>
        <label className={labelClass}>Officiating Bishop *</label>
        <NativeSelect
          value={bishopId}
          onChange={(e) => onBishopIdChange(e.target.value)}
          className="w-full"
          required
        >
          <option value="">Select your Bishop…</option>
          {bishops.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
          <option value={OTHER_BISHOP}>Other (not listed)</option>
        </NativeSelect>
        {selectedBishop && (
          <p className="text-xs text-[var(--muted)] mt-1">{selectedBishop.phone}</p>
        )}
      </div>

      {isOther && (
        <>
          <div>
            <label className={labelClass}>Bishop&apos;s Name *</label>
            <Input
              value={customName}
              onChange={(e) => onCustomNameChange(e.target.value)}
              className={inputClass}
              placeholder="Full name of the officiating Bishop"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Bishop&apos;s Contact Number *</label>
            <Input
              value={customPhone}
              onChange={(e) => onCustomPhoneChange(e.target.value)}
              className={inputClass}
              placeholder="0244000000"
              required
            />
          </div>
        </>
      )}
    </>
  );
}

export default function GuestBookingForm({
  facilities,
  defaultFacilityId,
  mode = "guest",
  currentUserRole,
  currentStaffEmail,
  ceremonyCodeId: initialCeremonyCodeId,
  isCeremonyBooking: initialIsCeremony = false,
  ceremonyFlatPrice,
  defaultCategory,
  ceremonyDays = [],
  defaultContactEmail = "",
  allowCeremony = true,
  allowPriceOverride = false,
  officePhone,
  officeEmail,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
  mode?: BookingMode;
  currentUserRole?: string;
  /** Used only to warn staff when they enter their own email as the customer contact. */
  currentStaffEmail?: string;
  ceremonyCodeId?: string;
  isCeremonyBooking?: boolean;
  ceremonyFlatPrice?: number;
  defaultCategory?: string;
  ceremonyDays?: string[];
  defaultContactEmail?: string;
  /** Staff only: whether the Wedding/Naming options may be chosen in-form. */
  allowCeremony?: boolean;
  /** Staff only: whether this session may waive/override the booking price. */
  allowPriceOverride?: boolean;
  /** Shown as a call/email CTA in place of the old code-request page. */
  officePhone?: string;
  officeEmail?: string;
}) {
  const router = useRouter();
  const [bookingMode, setBookingMode] = useState<"facility-first" | "category-first">("facility-first");
  const [step, setStep] = useState<1 | 2>(1);
  // Deep-linked ceremony bookings (from the catalog) arrive with a fixed venue +
  // validated code; in that case the type selector is locked.
  const lockType = initialIsCeremony && !!defaultFacilityId;
  // Staff need ceremony permission to choose Wedding/Naming; guests/patrons always can.
  const showTypeSelector = !lockType && (mode !== "staff" || allowCeremony);
  const [bookingType, setBookingType] = useState<BookingType>(
    initialIsCeremony
      ? ((defaultCategory ?? "").toUpperCase() === "NAMING" ? "naming" : "wedding")
      : "regular",
  );

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
  /** null until the booker answers the required Yes/No AC question */
  const [useAirConditioner, setUseAirConditioner] = useState<boolean | null>(null);
  // Allow FM, Booking Manager, and Super Admin to book on Mondays (all booking modes)
  const canBookMondays =
    ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(currentUserRole ?? "");

  const bypassLeadTime = canBookMondays;


  // Step 2 state — guest info + booking details
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(defaultContactEmail);
  const [contactPhone, setContactPhone] = useState("");
  const [confirmedOwnContactEmail, setConfirmedOwnContactEmail] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // The error banner sits above a long form, so on a phone it can be several
  // screens away from the submit button — scroll it into view or a failed
  // submission looks like nothing happened at all.
  const errorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  // Facility/Booking Managers and Super Admins may waive/override the price —
  // their bookings auto-approve immediately, skipping the usual approval-time
  // waive-billing option, so this is their only chance to adjust it. Resolved
  // server-side (allowPriceOverride) since "Booking Manager" isn't always a
  // literal role — it can be a STAFF account with the right permission.
  const isPricingManager = mode === "staff" && allowPriceOverride;
  const [waiveBilling, setWaiveBilling] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState("");

  // ── Ceremony-specific state ──────────────────────────────────────────────────
  // Wedding
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [coupleContact, setCoupleContact] = useState("");
  const [coupleEmail, setCoupleEmail] = useState("");
  // Naming
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [fatherWhatsApp, setFatherWhatsApp] = useState("");
  const [childrenNames, setChildrenNames] = useState("");
  const [childBirthday, setChildBirthday] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [namingEmail, setNamingEmail] = useState("");
  // Officiating Bishop — selected from the admin-managed list (shared by wedding + naming),
  // or typed in by hand when "Other" is chosen for a Bishop who isn't on the list.
  const [bishopId, setBishopId] = useState("");
  const [bishops, setBishops] = useState<BishopOption[]>([]);
  const [customBishopName, setCustomBishopName] = useState("");
  const [customBishopPhone, setCustomBishopPhone] = useState("");
  const selectedBishop = bishops.find((b) => b.id === bishopId) ?? null;
  const isOtherBishop = bishopId === OTHER_BISHOP;
  const bishopName = isOtherBishop ? customBishopName.trim() : selectedBishop?.name ?? "";
  const bishopPhone = isOtherBishop ? customBishopPhone.trim() : selectedBishop?.phone ?? "";
  // Mirrors the server-side ceremony schema (name min 2, phone min 9) so a hand-typed
  // Bishop is caught in the form rather than by a zod error after submitting.
  const bishopComplete = isOtherBishop
    ? bishopName.length >= 2 && bishopPhone.length >= 9
    : Boolean(selectedBishop);

  function handleBishopIdChange(next: string) {
    setBishopId(next);
    if (next !== OTHER_BISHOP) {
      setCustomBishopName("");
      setCustomBishopPhone("");
    }
  }

  // ── Unified booking-type state ───────────────────────────────────────────────
  const [ceremonyVenues, setCeremonyVenues] = useState<Facility[]>([]);
  const [fetchedCeremonyDays, setFetchedCeremonyDays] = useState<string[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [validatedCodeId, setValidatedCodeId] = useState<string>(initialCeremonyCodeId ?? "");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);

  const isCeremonyBooking = bookingType !== "regular";
  const ceremonyType: "wedding" | "naming" | null =
    bookingType === "wedding" ? "wedding" : bookingType === "naming" ? "naming" : null;
  const venueList = isCeremonyBooking ? ceremonyVenues : facilities;
  const effectiveCeremonyDays = ceremonyDays.length > 0 ? ceremonyDays : fetchedCeremonyDays;
  const resolvedCeremonyCodeId = initialCeremonyCodeId || validatedCodeId;

  // Keep `category` synced to the chosen ceremony type (WEDDING / NAMING).
  // Regular bookings resolve their category via the facility-categories effect.
  useEffect(() => {
    if (bookingType === "wedding") setCategory("WEDDING");
    else if (bookingType === "naming") setCategory("NAMING");
  }, [bookingType]);

  // Load ceremony venues + days on demand when a ceremony type is chosen.
  useEffect(() => {
    if (!isCeremonyBooking) {
      setCeremonyVenues([]);
      return;
    }
    const type = bookingType === "wedding" ? "WEDDING" : "NAMING";
    setSetupError(null);
    getCeremonyBookableFacilities(type)
      .then((v) => setCeremonyVenues(v as Facility[]))
      .catch(() => {
        setCeremonyVenues([]);
        setSetupError("We couldn't load ceremony venues. Please refresh the page and try again.");
      });
    if (ceremonyDays.length === 0) {
      getCeremonyDays().then(setFetchedCeremonyDays).catch(() => {
        setFetchedCeremonyDays([]);
        setSetupError("We couldn't load the ceremony dates. Please refresh the page and try again.");
      });
    }
    if (bishops.length === 0) {
      getActiveBishops().then(setBishops).catch(() => {
        setBishops([]);
        setSetupError("We couldn't load the list of bishops. Please refresh the page and try again.");
      });
    }
  }, [bookingType, isCeremonyBooking, ceremonyDays.length, bishops.length]);

  function handleBookingTypeChange(next: BookingType) {
    if (next === bookingType) return;
    setBookingType(next);
    setFacilityId("");
    setSelectedFacility(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setSlots([]);
    setCategory("");
    setValidatedCodeId(initialCeremonyCodeId ?? "");
    setCodeInput("");
    setCodeError(null);
    handleBishopIdChange("");
  }

  async function handleValidateCode() {
    setCodeChecking(true);
    setCodeError(null);
    try {
      const res = await validateCeremonyCode(codeInput.trim());
      if (!res.valid || !res.codeId) {
        setCodeError(res.error ?? "This payment code is not valid. Check the code and try again.");
        return;
      }
      const expected = bookingType === "wedding" ? "WEDDING" : "NAMING";
      if (res.ceremonyType !== expected) {
        setCodeError(`This code is for a ${String(res.ceremonyType ?? "").toLowerCase()} booking, not a ${ceremonyType}.`);
        return;
      }
      setValidatedCodeId(res.codeId);
      if (res.facilityId && res.facilityId !== facilityId) {
        // Switching the venue clears the chosen date/slot, so send the visitor
        // back to pick them again instead of leaving them on a form that can
        // no longer be submitted.
        setFacilityId(res.facilityId);
        setSetupError(
          "This payment code was issued for a different venue. We've switched your booking to that venue — please choose your date and time again.",
        );
        setStep(1);
      }
    } catch {
      setCodeError("We couldn't verify this payment code. Check your connection and try again.");
    } finally {
      setCodeChecking(false);
    }
  }

  const requiresBookingTerms = Boolean(selectedFacility?.requiresBookingTerms);
  const requiresItemTerms = Boolean(selectedFacility?.requiresItemBookingTerms);
  const requiredTerms = [
    ...(requiresBookingTerms ? (["BOOKING_TERMS"] as const) : []),
    ...(requiresItemTerms ? (["ITEM_BOOKING_TERMS"] as const) : []),
  ];
  const termsRequired = requiredTerms.length > 0;

  // With a single booking category (e.g. only "General"), auto-selection
  // handles it — so the mode toggle and the category dropdown are hidden and
  // users just pick venue → date → time. They reappear if more categories exist.
  const showModeToggle = !isCeremonyBooking && publicCategories.length > 1;
  const showCategorySelector =
    !isCeremonyBooking &&
    (bookingMode === "category-first"
      ? publicCategories.length > 1
      : categories.length > 1);

  useEffect(() => {
    getPublicBookingCategories().then((res) => {
      if (res.success) setPublicCategories(res.categories);
    });
  }, []);

  useEffect(() => {
    setFacilityId((prev) => {
      if (defaultFacilityId && venueList.some((f) => f.id === defaultFacilityId)) {
        return defaultFacilityId;
      }
      if (prev && venueList.some((f) => f.id === prev)) {
        return prev;
      }
      return "";
    });
  }, [defaultFacilityId, venueList]);

  // When facility changes, reset and fetch categories
  useEffect(() => {
    let cancelled = false;
    const f = venueList.find((x) => x.id === facilityId) ?? null;
    setSelectedFacility(f);

    if (f) {
      setSelectedDate((prev) => {
        if (!prev) return prev;
        return f.availableDays.includes(prev.getDay()) ? prev : undefined;
      });
    }

    setSlots([]);
    setSelectedSlot(null);

    // Ceremony bookings use a fixed category (WEDDING/NAMING) — skip the category
    // fetch, and drop any list left over from a regular venue the visitor looked
    // at first. A stale list would otherwise render the category selector with
    // WEDDING/NAMING selected — a value it never offers, since ceremony pricing
    // rows are inactive — leaving an empty `required` field that silently blocks
    // the whole form from submitting.
    if (isCeremonyBooking) {
      setCategories([]);
    } else if (f) {
      getFacilityCategories(f.id).then((res) => {
        // A late response must not overwrite state after the visitor has already
        // switched to a ceremony type — that would blank out the fixed category.
        if (cancelled || !res.success) return;
        setCategories(res.categories);
        setCategory((prev) => {
          if (prev && res.categories.some((c) => c.category === prev)) return prev;
          // Auto-select when only one category is available
          if (res.categories.length === 1) return res.categories[0].category;
          return "";
        });
      });
    } else {
      setCategories([]);
      setCategory("");
    }

    return () => {
      cancelled = true;
    };
  }, [facilityId, venueList, isCeremonyBooking]);

  useEffect(() => {
    if (bookingMode !== "category-first" || !category || !selectedDate) {
      setBookableFacilities([]);
      return;
    }

    getBookableFacilitiesByCategoryDate(category, selectedDate, {
      allowMonday: canBookMondays,
      leadTimeHours: bypassLeadTime ? 0 : 18,
      bypassMaxAdvance: bypassLeadTime,
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

    // Ceremonies use dedicated WEDDING/NAMING time slots (configured by staff),
    // booked at the venue's flat ceremony rate.
    const fetchSlots = isCeremonyBooking
      ? getCeremonyAvailability(
          facilityId,
          selectedDate,
          category as "WEDDING" | "NAMING",
          {
            allowMonday: canBookMondays,
            leadTimeHours: bypassLeadTime ? 0 : 18,
            bypassMaxAdvance: bypassLeadTime,
          },
        )
      : getFacilityAvailability(
          facilityId,
          selectedDate,
          category,
          {
            allowMonday: canBookMondays,
            leadTimeHours: bypassLeadTime ? 0 : 18,
            bypassMaxAdvance: bypassLeadTime,
          },
        );

    fetchSlots
      .then((res) => {
        if (res.success) {
          setSlots(res.slots || []);
        } else {
          setSlots([]);
          setSetupError(res.error ?? "We couldn't load time slots for this date. Please choose another date or try again.");
        }
      })
      .catch(() => {
        setSlots([]);
        setSetupError("We couldn't load time slots. Check your connection and try again.");
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, facilityId, category, isCeremonyBooking, canBookMondays, bypassLeadTime]);

  // Compute estimated cost from selected slot (AC is cash-only at Front Office — not billed online)
  const estimatedCost = (() => {
    if (isCeremonyBooking) {
      const flat = selectedFacility?.flatPrice ?? ceremonyFlatPrice;
      return flat != null ? Number(flat) : null;
    }
    if (!selectedSlot) return null;
    return selectedSlot.isFree ? 0 : selectedSlot.effectivePricePerHour;
  })();

  const disabledDays = [
    () => !isCeremonyBooking && !category,
    { before: addDays(new Date(), 1) },
    ...(bypassLeadTime
      ? []
      : [{ after: addDays(new Date(), isCeremonyBooking ? MAX_CEREMONY_BOOKING_ADVANCE_DAYS : MAX_BOOKING_ADVANCE_DAYS) }]),
    ...(canBookMondays ? [] : [{ dayOfWeek: [1] }]),
    (date: Date) =>
      !!(selectedFacility && !selectedFacility.availableDays.includes(date.getDay())),
    // Ceremony booking: only ceremony days are selectable
    ...(isCeremonyBooking && effectiveCeremonyDays.length > 0
      ? [(date: Date) => !effectiveCeremonyDays.includes(toDateStr(date))]
      : []),
    // General booking: ceremony days are blocked
    ...(!isCeremonyBooking && effectiveCeremonyDays.length > 0
      ? [(date: Date) => effectiveCeremonyDays.includes(toDateStr(date))]
      : []),
  ];

  function resolveBookingEmail() {
    if (mode === "guest") return guestEmail.trim();
    if (isCeremonyBooking && ceremonyType === "wedding") return coupleEmail.trim();
    if (isCeremonyBooking && ceremonyType === "naming") return namingEmail.trim();
    return contactEmail.trim();
  }

  function resolveBookingPhone() {
    if (mode === "guest") return guestPhone.trim();
    if (isCeremonyBooking && ceremonyType === "wedding") return coupleContact.trim();
    if (isCeremonyBooking && ceremonyType === "naming") return fatherPhone.trim();
    return contactPhone.trim();
  }

  const usesStaffOwnEmail =
    mode === "staff" &&
    Boolean(currentStaffEmail) &&
    resolveBookingEmail().toLowerCase() === currentStaffEmail?.trim().toLowerCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // These are chosen in step 1, but a venue change (e.g. a payment code issued
    // for another venue) clears the slot behind the visitor's back — so say so
    // rather than returning silently and leaving the button doing nothing.
    if (!selectedFacility || !selectedDate || !selectedSlot) {
      setError("Your venue, date, or time slot is no longer selected. Please go back and choose them again.");
      return;
    }
    if (!title.trim()) {
      setError("Please give this booking a title.");
      return;
    }
    if (mode === "guest" && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim())) {
      setError("Please fill in your name, email, and phone number.");
      return;
    }
    const bookingEmail = resolveBookingEmail();
    if (!bookingEmail || !isValidEmail(bookingEmail)) {
      setError("A valid email address is required to complete your booking.");
      return;
    }
    const bookingPhone = resolveBookingPhone();
    if (mode === "staff" && !bookingPhone) {
      setError("A contact phone number is required to complete your booking.");
      return;
    }
    if (usesStaffOwnEmail && !confirmedOwnContactEmail) {
      setError("This is your staff email. Confirm that this should remain the booking contact before continuing.");
      return;
    }
    if (termsRequired && !agreedToTerms) {
      setError("Please agree to the required terms before submitting.");
      return;
    }
    if (isCeremonyBooking && mode !== "staff" && !resolvedCeremonyCodeId) {
      setError("Please enter a valid payment code to continue.");
      return;
    }
    if (isCeremonyBooking && !bishopComplete) {
      setError(
        "Please select the officiating Bishop — or choose “Other” and enter the Bishop's name and contact number.",
      );
      return;
    }
    if (useAirConditioner === null) {
      setError("Please indicate whether you will require air conditioning (AC) during your booking.");
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
    // Overnight slots (e.g. 22:00 -> 04:00) end on the following calendar day.
    if (isOvernight(selectedSlot.startTime, selectedSlot.endTime)) {
      endTime.setDate(endTime.getDate() + 1);
    }

    // Build ceremony details if applicable
    const builtCeremonyDetails = (() => {
      if (!isCeremonyBooking || !ceremonyType) return undefined;
      if (ceremonyType === "wedding") {
        return {
          type: "wedding" as const,
          brideName, groomName, contactWhatsApp: coupleContact, email: coupleEmail,
          bishopName, bishopPhone,
        };
      }
      return {
        type: "naming" as const,
        fatherName, fatherPhone, fatherWhatsApp, childrenNames, childBirthday,
        motherName, motherPhone, email: namingEmail,
        bishopName, bishopPhone,
      };
    })();

    const bookingPayload = {
      facilityId: selectedFacility.id,
      category: category as any,
      title,
      description: description || undefined,
      startTime,
      endTime,
      useAirConditioner: useAirConditioner === true,
      acceptedTerms: agreedToTerms ? requiredTerms : [],
      contactEmail: bookingEmail,
      ...(builtCeremonyDetails ? { ceremonyDetails: builtCeremonyDetails } : {}),
      ...(resolvedCeremonyCodeId ? { ceremonyCodeId: resolvedCeremonyCodeId } : {}),
      ...(mode === "staff" ? {
        contactPhone: bookingPhone,
        confirmOwnContactEmail: confirmedOwnContactEmail,
        waiveBilling: isPricingManager && waiveBilling,
        ...(isPricingManager && !waiveBilling && overrideAmount.trim() !== ""
          ? { overrideAmount: Number(overrideAmount) }
          : {}),
      } : {}),
    };

    try {
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

      if ("error" in result && result.error) {
        setError(result.error as string);
        return;
      }

      if (mode === "guest") {
        setSuccessMessage("Booking request submitted successfully! You can create a patron account to track your booking status.");
        return;
      }

      router.push(mode === "patron" ? "/patron/bookings" : "/bookings");
      router.refresh();
    } catch (submissionError) {
      // A thrown (rather than returned) error still needs to clear the
      // submitting state — otherwise the button is stuck on "Submitting…"
      // forever with no feedback for the user to act on.
      setError(
        submissionError instanceof TypeError
          ? "We couldn't reach the booking service. Check your internet connection and try again."
          : "We couldn't submit this booking. Refresh the page and try again; if the issue continues, contact the church office.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <Card className="p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center bg-green-500/12 dark:bg-green-500/20">
          <Check size={28} className="text-green-600" />
        </div>
        <h2 className="font-display font-bold text-[var(--navy)] dark:text-gray-100 text-xl">Booking Submitted!</h2>
        <p className="text-sm text-[var(--slate)] dark:text-gray-300">{successMessage}</p>
      </Card>
    );
  }

  // ─── STEP 1: Calendly-style picker ───────────────────────────────────────
  if (step === 1) {
    return (
      <Card className="overflow-hidden">
        {setupError && (
          <div className="mx-5 mt-5 bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">
            {setupError}
          </div>
        )}
        {/* Booking type selector */}
        {showTypeSelector && (
          <div className="px-5 pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-2">
              What are you booking?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "regular", label: "Regular", icon: CalendarDays, hint: "Events & meetings" },
                { key: "wedding", label: "Wedding", icon: Heart, hint: "Saturdays only" },
                { key: "naming", label: "Naming", icon: Baby, hint: "Saturdays only" },
              ] as const).map(({ key, label, icon: Icon, hint }) => {
                const active = bookingType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleBookingTypeChange(key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-colors",
                      active
                        ? "border-[var(--gold)] bg-[var(--gold)]/10"
                        : "border-[var(--border)] bg-white dark:bg-[rgba(15,26,43,0.4)] hover:border-[var(--gold)]/40",
                    )}
                  >
                    <Icon size={18} className={active ? "text-[var(--gold)]" : "text-[var(--muted)] dark:text-gray-400"} />
                    <span className="text-sm font-semibold text-[var(--navy)] dark:text-gray-100">{label}</span>
                    <span className="hidden sm:block text-[10px] text-[var(--muted)] dark:text-gray-400">{hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ceremony payment explainer — surfaced up front */}
        {isCeremonyBooking && mode !== "staff" && (
          <div className="px-5 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/25 px-4 py-3">
              <Info size={16} className="text-[var(--gold)] shrink-0" aria-hidden />
              <p className="text-sm text-[var(--slate)] dark:text-gray-300 min-w-0 flex-1">
                {ceremonyType === "wedding" ? "Wedding" : "Naming"} bookings are held on ceremony Saturdays and require a <strong>payment code</strong>
                {estimatedCost != null ? <> — this venue is <strong>{formatCurrency(estimatedCost)}</strong></> : null}. Contact our office to arrange payment and receive your code.
              </p>
              <ContactOfficeLink
                officePhone={officePhone}
                officeEmail={officeEmail}
                label="Call our office"
                className="text-xs font-semibold text-[var(--gold)] hover:underline whitespace-nowrap shrink-0"
              />
            </div>
          </div>
        )}

        {/* Booking mode + selectors */}
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--cream)] dark:bg-[rgba(15,26,43,0.4)]">
          {showModeToggle && (
          <div className="mb-3 inline-flex rounded-lg border border-[var(--border)] bg-white p-1">
            <button
              type="button"
              onClick={() => setBookingMode("facility-first")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                bookingMode === "facility-first" ? "bg-primary text-primary-foreground" : "text-[var(--slate)]"
              }`}
            >
              Venue -&gt; Category
            </button>
            <button
              type="button"
              onClick={() => setBookingMode("category-first")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                bookingMode === "category-first" ? "bg-primary text-primary-foreground" : "text-[var(--slate)]"
              }`}
            >
              Category -&gt; Venue
            </button>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {showCategorySelector && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-2">
                Event Category
              </label>
              <NativeSelect
                value={category}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  setSelectedSlot(null);
                  setSlots([]);
                }}
                className="w-full"
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
              </NativeSelect>
            </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-2">
                {isCeremonyBooking && (defaultFacilityId || validatedCodeId) ? "Venue" : "Select Venue"}
              </label>
              {isCeremonyBooking && (defaultFacilityId || validatedCodeId) ? (
                <div className={cn("flex min-h-11 w-full items-center justify-between rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--field-bg,var(--surface))] px-3 py-2 cursor-default select-none opacity-80")}>
                  <span className="font-medium text-[var(--navy)] dark:text-gray-100">
                    {selectedFacility?.name ?? "Loading…"}
                  </span>
                  {selectedFacility && (
                    <span className="text-xs text-[var(--muted)] ml-2 shrink-0">
                      Up to {selectedFacility.capacity} guests
                    </span>
                  )}
                </div>
              ) : (
                <NativeSelect
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full"
                  disabled={bookingMode === "category-first" && (!category || !selectedDate)}
                >
                  <option value="">Choose a venue...</option>
                  {(isCeremonyBooking
                    ? ceremonyVenues
                    : bookingMode === "category-first"
                    ? bookableFacilities
                    : facilities
                  ).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </NativeSelect>
              )}
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
          <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)_minmax(220px,260px)] divide-y xl:divide-y-0 xl:divide-x divide-[var(--border)]">

            {/* LEFT — Calendar */}
            <div className="min-w-0 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400 mb-3">
                Select a Date
              </p>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
                disabled={disabledDays}
                fromDate={addDays(new Date(), 1)}
                toDate={addDays(new Date(), isCeremonyBooking ? MAX_CEREMONY_BOOKING_ADVANCE_DAYS : 90)}
                modifiersStyles={{
                  selected: { background: "var(--navy)", color: "#ffffff", borderRadius: "50%" },
                  today: { color: "var(--gold)", fontWeight: "bold" },
                }}
              />
            </div>

            {/* CENTER — Time Slots */}
            <div className="min-w-0 p-5">
              {!selectedFacility ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <Clock size={30} className="mb-3 text-[var(--muted)] dark:text-gray-400 opacity-25" />
                  <p className="text-sm text-[var(--muted)] dark:text-gray-400">Select a venue to load available slots</p>
                </div>
              ) : showCategorySelector && !category ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <Clock size={30} className="mb-3 text-[var(--muted)] dark:text-gray-400 opacity-25" />
                  <p className="text-sm text-[var(--muted)] dark:text-gray-400">Select an event category first</p>
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
                                className={`text-sm font-semibold tabular-nums min-w-[150px] sm:min-w-[170px] text-left ${isSelected ? "text-[#fff]" : "text-[var(--navy)] dark:text-gray-100"}`}
                              >
                                {formatTime(slot.startTime)} to {formatTime(slot.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCeremonyBooking ? null : slot.isFree ? (
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-white/15 text-[#fff]/90" : "bg-green-500/12 text-green-600 dark:bg-[rgba(34,197,94,0.2)] dark:text-green-400"}`}
                                >
                                  FREE
                                </span>
                              ) : (
                                <span
                                  className={`text-xs ${isSelected ? "text-[#fff]/65" : "text-[var(--slate)] dark:text-gray-400"}`}
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
            <div className="min-w-0 p-5 bg-[#fafaf8] dark:bg-[rgba(15,26,43,0.4)]">
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
                      {formatTime(selectedSlot.startTime)} to {formatTime(selectedSlot.endTime)}
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
              {showCategorySelector && !category
                ? "Pick an event category"
                : !selectedDate
                ? "Pick a date to continue"
                : !selectedSlot
                ? "Pick a time slot"
                : `${format(selectedDate, "MMM d")} - ${formatTime(selectedSlot.startTime)} to ${formatTime(selectedSlot.endTime)}`}
            </p>
            <Button
              type="button"
              onClick={() => { setSetupError(null); setStep(2); }}
              disabled={!category || !selectedFacility || !selectedDate || !selectedSlot}
              className="w-full sm:w-auto gap-2"
              style={{ opacity: category && selectedFacility && selectedDate && selectedSlot ? 1 : 0.35 }}
            >
              Next <ArrowRight size={15} />
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // ─── STEP 2: Guest info + Booking details ────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      // Native validation blocks submission before `onSubmit` ever runs, and its
      // bubble is easy to miss on a phone — surface it so the button is never
      // silently inert.
      onInvalidCapture={() => {
        setError("Some required details are missing or incomplete. Please check the fields marked * below and try again.");
      }}
      className="max-w-2xl space-y-5"
    >
      {/* Summary card */}
      <div className="rounded-xl p-4 text-[#fff] bg-[var(--navy)] dark:bg-[rgba(15,26,43,0.8)] border border-transparent dark:border-[rgba(255,255,255,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-[#fff]/50">
              {selectedFacility?.name}
            </p>
            <p className="font-semibold text-[#fff]">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-sm mt-0.5 text-[#fff]/65">
              {selectedSlot &&
                `${formatTime(selectedSlot.startTime)} to ${formatTime(selectedSlot.endTime)}`}
            </p>
          </div>
          {estimatedCost !== null && (
            <div className="text-right shrink-0">
              <p className="text-xs mb-0.5 text-[#fff]/50">Estimated</p>
              <p className={`text-xl font-bold ${estimatedCost === 0 ? "text-success" : "text-[var(--gold)]"}`}>
                {estimatedCost === 0 ? "FREE" : formatCurrency(estimatedCost)}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div ref={errorRef} className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      {usesStaffOwnEmail && (
        <Card className="p-4 border-warning/40 bg-warning/10 space-y-2">
          <p className="text-sm font-semibold text-[var(--navy)] dark:text-gray-100">You entered your own staff email</p>
          <p className="text-xs text-[var(--slate)] dark:text-gray-300">
            This will remain a staff-created booking. Staff ceremony-code bypass and approval privileges will apply, and notifications will be sent to you instead of the customer.
          </p>
          <label className="flex items-start gap-2 text-sm text-[var(--slate)] dark:text-gray-300">
            <input
              type="checkbox"
              checked={confirmedOwnContactEmail}
              onChange={(e) => setConfirmedOwnContactEmail(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--border)]"
            />
            <span>I confirm that my email should be used as the contact for this staff booking.</span>
          </label>
        </Card>
      )}

      {/* Contact email — staff & patron regular bookings */}
      {(mode === "staff" || mode === "patron") && !isCeremonyBooking && (
        <Card className="p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400">Contact Information</p>
          <div className={mode === "staff" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : undefined}>
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Email *</label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                type="email"
                placeholder="contact@example.com"
                required
              />
            </div>
            {mode === "staff" && (
              <div>
                <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Phone *</label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0244000000"
                  required
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Pricing override — Facility Managers & Super Admins only */}
      {isPricingManager && (
        <Card className="p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400">Pricing (Manager Override)</p>
          <label className="flex items-center gap-2 text-sm text-[var(--slate)] dark:text-gray-300">
            <input
              type="checkbox"
              checked={waiveBilling}
              onChange={(e) => setWaiveBilling(e.target.checked)}
            />
            Waive billing (mark as free)
          </label>
          {!waiveBilling && (
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Custom Amount (optional)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder={estimatedCost != null ? `Default: ${formatCurrency(estimatedCost)}` : "Leave blank to use default pricing"}
              />
            </div>
          )}
        </Card>
      )}

      {/* Guest information */}
      {mode === "guest" && (
        <Card className="p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400">Guest Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Full Name *</label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Email *</label>
              <Input
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                type="email"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Phone *</label>
            <Input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="0201234567"
              required
            />
          </div>
        </Card>
      )}

      {/* Event type — never for ceremonies, whose category is fixed by the booking type */}
      {!isCeremonyBooking && categories.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Event Type *</label>
          <NativeSelect
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full"
            required
          >
            <option value="">Select event type…</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {formatCategoryLabel(c.category)} — {formatCurrency(c.price)}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {/* Booking title */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Booking Title *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Wedding Reception, Corporate Conference"
          required
        />
      </div>

      {selectedFacility && (
        <Card className="p-4 space-y-3">
          <p className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300">
            Will you require the use of air conditioning (AC) during your booking? *
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--slate)] dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="useAirConditioner"
                checked={useAirConditioner === true}
                onChange={() => setUseAirConditioner(true)}
                className="h-4 w-4 border-[var(--border)]"
                required
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--slate)] dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="useAirConditioner"
                checked={useAirConditioner === false}
                onChange={() => setUseAirConditioner(false)}
                className="h-4 w-4 border-[var(--border)]"
                required
              />
              No
            </label>
          </div>
        </Card>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] dark:text-gray-300 mb-1">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Tell us more about your event…"
        />
      </div>

      {/* Payment code (ceremony) */}
      {isCeremonyBooking && !initialCeremonyCodeId && (
        <Card className="p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] dark:text-gray-400">
            Payment Code{mode !== "staff" ? " *" : " (optional)"}
          </p>
          <p className="text-sm text-[var(--slate)] dark:text-gray-300">
            {ceremonyType === "wedding" ? "Wedding" : "Naming"} bookings require a payment code issued after your payment is confirmed.
          </p>
          {validatedCodeId ? (
            <p className="flex items-center gap-1 text-sm font-semibold text-green-600">
              <Check size={15} /> Code verified
            </p>
          ) : (
            <div className="flex gap-2">
              <Input
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); }}
                placeholder="e.g. ABCD1234"
                className="flex-1 font-mono tracking-widest uppercase"
                maxLength={8}
              />
              <Button type="button" variant="outline" disabled={codeChecking || !codeInput.trim()} onClick={handleValidateCode}>
                {codeChecking ? "…" : "Verify"}
              </Button>
            </div>
          )}
          {codeError && <p className="text-sm text-danger">{codeError}</p>}
          {mode !== "staff" && (
            <ContactOfficeLink
              officePhone={officePhone}
              officeEmail={officeEmail}
              label="Don't have a code? Call our office"
              className="inline-block text-xs text-[var(--gold)] underline"
            />
          )}
        </Card>
      )}

      {/* ── Ceremony details ─────────────────────────────────────────── */}
      {isCeremonyBooking && ceremonyType === "wedding" && (
        <Card className="p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Wedding Details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Bride&apos;s Name *</label>
              <Input value={brideName} onChange={(e) => setBrideName(e.target.value)} placeholder="Full name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Groom&apos;s Name *</label>
              <Input value={groomName} onChange={(e) => setGroomName(e.target.value)} placeholder="Full name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Contact (WhatsApp) *</label>
              <Input value={coupleContact} onChange={(e) => setCoupleContact(e.target.value)} placeholder="0244000000" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Email *</label>
              <Input type="email" value={coupleEmail} onChange={(e) => setCoupleEmail(e.target.value)} placeholder="couple@email.com" required />
            </div>
            <BishopPicker
              bishops={bishops}
              bishopId={bishopId}
              onBishopIdChange={handleBishopIdChange}
              customName={customBishopName}
              onCustomNameChange={setCustomBishopName}
              customPhone={customBishopPhone}
              onCustomPhoneChange={setCustomBishopPhone}
            />
          </div>
        </Card>
      )}

      {isCeremonyBooking && ceremonyType === "naming" && (
        <Card className="p-5 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Naming Ceremony Details</p>

          {/* Father */}
          <div>
            <p className="text-xs font-semibold text-[var(--slate)] mb-3">Father</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Full Name *</label>
                <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="text-sm" placeholder="Father's name" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Contact Number *</label>
                <Input value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} className="text-sm" placeholder="Phone" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">WhatsApp Number *</label>
                <Input value={fatherWhatsApp} onChange={(e) => setFatherWhatsApp(e.target.value)} className="text-sm" placeholder="WhatsApp" required />
              </div>
            </div>
          </div>

          {/* Child */}
          <div>
            <p className="text-xs font-semibold text-[var(--slate)] mb-3">Child</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Name(s) *</label>
                <Input value={childrenNames} onChange={(e) => setChildrenNames(e.target.value)} className="text-sm" placeholder="Child's full name(s)" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Date of Birth (DD/MM/YYYY) *</label>
                <Input value={childBirthday} onChange={(e) => setChildBirthday(e.target.value)} className="text-sm" placeholder="DD/MM/YYYY" required />
              </div>
            </div>
          </div>

          {/* Mother */}
          <div>
            <p className="text-xs font-semibold text-[var(--slate)] mb-3">Mother</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Full Name *</label>
                <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} className="text-sm" placeholder="Mother's name" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Contact Number *</label>
                <Input value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)} className="text-sm" placeholder="Phone" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Email *</label>
                <Input type="email" value={namingEmail} onChange={(e) => setNamingEmail(e.target.value)} className="text-sm" placeholder="family@email.com" required />
              </div>
            </div>
          </div>

          {/* Clergy */}
          <div>
            <p className="text-xs font-semibold text-[var(--slate)] mb-3">Officiating Clergy</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BishopPicker
                bishops={bishops}
                bishopId={bishopId}
                onBishopIdChange={handleBishopIdChange}
                customName={customBishopName}
                onCustomNameChange={setCustomBishopName}
                customPhone={customBishopPhone}
                onCustomPhoneChange={setCustomBishopPhone}
                compact
              />
            </div>
          </div>
        </Card>
      )}

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
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(1)}
          className="w-full sm:w-auto gap-2"
        >
          <ChevronLeft size={16} /> Back
        </Button>
        <Button
          type="submit"
          disabled={
            submitting ||
            !title.trim() ||
            (mode === "guest" && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim() || !isValidEmail(guestEmail))) ||
            ((mode === "staff" || mode === "patron") && !isCeremonyBooking && (!contactEmail.trim() || !isValidEmail(contactEmail))) ||
            (mode === "staff" && !isCeremonyBooking && !contactPhone.trim()) ||
            (usesStaffOwnEmail && !confirmedOwnContactEmail) ||
            (isCeremonyBooking && mode !== "staff" && !resolvedCeremonyCodeId) ||
            (!isCeremonyBooking && categories.length > 0 && !category) ||
            (termsRequired && !agreedToTerms) ||
            (isCeremonyBooking && ceremonyType === "wedding" && (!brideName.trim() || !groomName.trim() || !coupleContact.trim() || !coupleEmail.trim() || !isValidEmail(coupleEmail) || !bishopComplete)) ||
            (isCeremonyBooking && ceremonyType === "naming" && (!fatherName.trim() || !fatherPhone.trim() || !fatherWhatsApp.trim() || !childrenNames.trim() || !childBirthday.trim() || !motherName.trim() || !motherPhone.trim() || !namingEmail.trim() || !isValidEmail(namingEmail) || !bishopComplete))
          }
          className="w-full sm:flex-1"
        >
          {submitting ? "Submitting…" : mode === "guest" ? "Submit Booking Request" : "Create Booking"}
        </Button>
      </div>
    </form>
  );
}
