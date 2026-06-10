"use server";

import { prisma } from "@/lib/db/prisma";
import { bookingOverlapsSlot, toMinutes } from "@/lib/time-utils";
import {
  isBeyondMaxBookingAdvance,
  MAX_BOOKING_ADVANCE_ERROR,
  MIN_BOOKING_NOTICE_HOURS,
} from "@/lib/booking-window";

interface TimeSlotAvailability {
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

const DEFAULT_LEAD_TIME_HOURS = MIN_BOOKING_NOTICE_HOURS;

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3_600_000);
}

function slotStartsBeforeLeadTime(date: Date, slotStartTime: string, leadTimeHours: number) {
  const [h, m] = slotStartTime.split(":").map(Number);
  const slotStart = new Date(date);
  slotStart.setHours(h, m, 0, 0);
  return slotStart.getTime() < addHours(new Date(), leadTimeHours).getTime();
}

/**
 * Get available time slots for a facility on a specific date.
 * Returns empty slots + a maintenanceWindow if the date falls within scheduled maintenance.
 */
export async function getFacilityAvailability(
  facilityId: string,
  date: Date,
  category?: string,
  options?: {
    allowMonday?: boolean;
    leadTimeHours?: number;
    bypassMaxAdvance?: boolean;
  }
) {
  try {
    if (!category) {
      return {
        success: false,
        error: "Event category is required.",
        slots: [],
      };
    }

    if (!options?.bypassMaxAdvance && isBeyondMaxBookingAdvance(date)) {
      return {
        success: true,
        slots: [],
        maintenanceWindow: null,
        emergencyMaintenance: false,
        message: MAX_BOOKING_ADVANCE_ERROR,
      };
    }

    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    const allowMonday = options?.allowMonday ?? false;
    const leadTimeHours = options?.leadTimeHours ?? DEFAULT_LEAD_TIME_HOURS;

    // Mondays are office off-days (Sabbath) — no availability
    if (dayOfWeek === 1 && !allowMonday) {
      return {
        success: true,
        slots: [],
        maintenanceWindow: null,
        emergencyMaintenance: false,
        message: "The office is closed on Mondays (Sabbath day). No bookings available.",
      };
    }

    // Check if this date is within a scheduled maintenance window
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [maintConflict, facility, categoryPricing, activeCategory] = await Promise.all([
      prisma.maintenanceRequest.findFirst({
        where: {
          facilityId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          scheduledStart: { not: null, lt: endOfDay },
          scheduledEnd:   { not: null, gt: startOfDay },
        },
        select: { title: true, scheduledStart: true, scheduledEnd: true },
      }),
      prisma.facility.findUnique({
        where: { id: facilityId },
        select: { underMaintenance: true },
      }),
      prisma.facilityPricing.findFirst({
        where: { facilityId, category, isActive: true },
      }),
      prisma.bookingCategory.findFirst({
        where: { slug: category, isActive: true },
        select: { id: true },
      }),
    ]);

    if (!activeCategory) {
      return {
        success: false,
        error: "This booking category is no longer available.",
        slots: [],
      };
    }

    // Hard emergency lock
    if (facility?.underMaintenance) {
      return {
        success: true,
        slots: [],
        maintenanceWindow: null,
        emergencyMaintenance: true,
        message: "Facility is under emergency maintenance.",
      };
    }

    // Scheduled maintenance for this date
    if (maintConflict) {
      return {
        success: true,
        slots: [],
        emergencyMaintenance: false,
        maintenanceWindow: {
          title: maintConflict.title,
          start: maintConflict.scheduledStart,
          end:   maintConflict.scheduledEnd,
        },
        message: `Facility is under scheduled maintenance on this date (${maintConflict.title}).`,
      };
    }

    const categoryPricing2 = categoryPricing;
    if (!categoryPricing2) {
      return {
        success: false,
        error: "No category pricing configured for this facility.",
        slots: [],
      };
    }

    // Get time slots for this day
    const timeSlots = await prisma.facilityTimeSlot.findMany({
      where: {
        facilityId,
        dayOfWeek,
        isActive: true,
        category,
      },
      orderBy: [{ startTime: "asc" }, { category: "asc" }],
    });

    if (timeSlots.length === 0) {
      return {
        success: true,
        slots: [],
        message: "No time slots configured for this day",
      };
    }

    // Get existing bookings for this date (startOfDay/endOfDay defined above)
    const existingBookings = await prisma.booking.findMany({
      where: {
        facilityId,
        deletedAt: null,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startTime: { gte: startOfDay, lte: endOfDay },
          },
          {
            endTime: { gte: startOfDay, lte: endOfDay },
          },
          {
            AND: [
              { startTime: { lte: startOfDay } },
              { endTime: { gte: endOfDay } },
            ],
          },
        ],
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Calculate availability for each slot
    const slotsWithAvailability: TimeSlotAvailability[] = timeSlots.map(
      (slot) => {
        // Count bookings that overlap with this slot (overnight-aware)
        const slotStartMin = toMinutes(slot.startTime);
        const slotEndMin = toMinutes(slot.endTime);

        const overlappingBookings = existingBookings.filter((booking) => {
          const bookingStartMin = booking.startTime.getHours() * 60 + booking.startTime.getMinutes();
          const bookingEndMin = booking.endTime.getHours() * 60 + booking.endTime.getMinutes();

          return bookingOverlapsSlot(bookingStartMin, bookingEndMin, slotStartMin, slotEndMin);
        });

        const currentBookings = overlappingBookings.length;
        const blockedByLeadTime = slotStartsBeforeLeadTime(date, slot.startTime, leadTimeHours);
        const isAvailable = currentBookings < slot.maxBookings && !blockedByLeadTime;
        const basePrice = categoryPricing2 ? Number(categoryPricing2.price) : 0;
        // Zero out price only if explicitly configured: slot.isFree or the day is in freeDays.
        // Weekdays are NOT automatically free — pricing is determined solely by slot/category config.
        const isFreeByDay = categoryPricing2 ? categoryPricing2.freeDays.includes(dayOfWeek) : false;
        const effectivePricePerHour = slot.isFree || isFreeByDay
          ? 0
          : slot.pricePerHourOverride !== null
          ? Number(slot.pricePerHourOverride)
          : basePrice;

        return {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          label: slot.label,
          isFlexible: slot.isFlexible,
          isFree: effectivePricePerHour === 0,
          effectivePricePerHour,
          maxBookings: slot.maxBookings,
          currentBookings,
          isAvailable,
        };
      }
    );

    return {
      success: true,
      slots: slotsWithAvailability,
      hasFlexibleSlots: slotsWithAvailability.some((s) => s.isFlexible),
      hasStrictSlots: slotsWithAvailability.some((s) => !s.isFlexible),
    };
  } catch (error) {
    console.error("Error fetching availability:", error);
    return {
      success: false,
      error: "Failed to fetch availability",
      slots: [],
    };
  }
}

/**
 * Get pricing for a facility and category
 */
export async function getFacilityPricing(
  facilityId: string,
  category: string,
  date?: Date
) {
  try {
    const pricing = await prisma.facilityPricing.findFirst({
      where: {
        facilityId,
        category,
        isActive: true,
      },
    });

    if (!pricing) {
      return {
        success: false,
        error: "No pricing configured for this category",
      };
    }

    const selectedDay = date ? date.getDay() : null;
    const isFreeOnSelectedDay = selectedDay !== null ? pricing.freeDays.includes(selectedDay) : false;

    return {
      success: true,
      pricing: {
        price: isFreeOnSelectedDay ? 0 : Number(pricing.price),
        freeDays: pricing.freeDays,
        isFreeOnSelectedDay,
        description: pricing.description,
      },
    };
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return {
      success: false,
      error: "Failed to fetch pricing",
    };
  }
}

/**
 * Get available categories for a facility
 */
export async function getFacilityCategories(facilityId: string) {
  try {
    const activeCategorySlugs = await prisma.bookingCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    });

    const pricingRecords = await prisma.facilityPricing.findMany({
      where: {
        facilityId,
        isActive: true,
        category: { in: activeCategorySlugs.map((c) => c.slug) },
      },
      select: {
        category: true,
        price: true,
        freeDays: true,
        description: true,
      },
      orderBy: {
        category: "asc",
      },
    });

    return {
      success: true,
      categories: pricingRecords.map((p) => ({
        category: p.category,
        price: Number(p.price),
        freeDays: p.freeDays,
        description: p.description,
      })),
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: "Failed to fetch categories",
      categories: [],
    };
  }
}

/**
 * Get all active booking categories for public booking flows.
 */
export async function getPublicBookingCategories() {
  try {
    const categories = await prisma.bookingCategory.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      orderBy: { sortOrder: "asc" },
    });

    return {
      success: true,
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
      })),
    };
  } catch (error) {
    console.error("Error fetching public booking categories:", error);
    return {
      success: false,
      error: "Failed to fetch booking categories",
      categories: [],
    };
  }
}

/**
 * Category-first discovery: return only facilities with at least one available slot
 * for the selected category and date.
 */
export async function getBookableFacilitiesByCategoryDate(
  category: string,
  date: Date,
  options?: {
    allowMonday?: boolean;
    leadTimeHours?: number;
    bypassMaxAdvance?: boolean;
  }
) {
  try {
    if (!category) {
      return { success: false, error: "Event category is required.", facilities: [] };
    }

    if (!options?.bypassMaxAdvance && isBeyondMaxBookingAdvance(date)) {
      return {
        success: true,
        facilities: [],
        message: MAX_BOOKING_ADVANCE_ERROR,
      };
    }

    const dayOfWeek = date.getDay();
    const allowMonday = options?.allowMonday ?? false;
    const leadTimeHours = options?.leadTimeHours ?? DEFAULT_LEAD_TIME_HOURS;
    if (dayOfWeek === 1 && !allowMonday) {
      return {
        success: true,
        facilities: [],
        message: "The office is closed on Mondays (Sabbath day).",
      };
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const facilities = await prisma.facility.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        underMaintenance: false,
        availableDays: { has: dayOfWeek },
        pricing: {
          some: {
            category,
            isActive: true,
          },
        },
        timeSlots: {
          some: {
            dayOfWeek,
            isActive: true,
            category,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        requiresBookingTerms: true,
        requiresItemBookingTerms: true,
        acUsageFee: true,
        amenities: true,
        availableDays: true,
        pricing: {
          where: { category, isActive: true },
          select: { price: true, freeDays: true },
          take: 1,
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const facilityIds = facilities.map((f) => f.id);

    // Batch all per-facility queries in parallel instead of N*7 sequential queries
    const [maintConflicts, activeCategory, allTimeSlots, allCategoryPricing, allBookings] =
      await Promise.all([
        prisma.maintenanceRequest.findMany({
          where: {
            facilityId: { in: facilityIds },
            status: { in: ["OPEN", "IN_PROGRESS"] },
            scheduledStart: { not: null, lt: endOfDay },
            scheduledEnd: { not: null, gt: startOfDay },
          },
          select: { facilityId: true },
        }),
        prisma.bookingCategory.findFirst({
          where: { slug: category, isActive: true },
          select: { id: true },
        }),
        prisma.facilityTimeSlot.findMany({
          where: { facilityId: { in: facilityIds }, dayOfWeek, isActive: true, category },
        }),
        prisma.facilityPricing.findMany({
          where: { facilityId: { in: facilityIds }, category, isActive: true },
        }),
        prisma.booking.findMany({
          where: {
            facilityId: { in: facilityIds },
            deletedAt: null,
            status: { in: ["PENDING", "APPROVED"] },
            OR: [
              { startTime: { gte: startOfDay, lte: endOfDay } },
              { endTime: { gte: startOfDay, lte: endOfDay } },
              { AND: [{ startTime: { lte: startOfDay } }, { endTime: { gte: endOfDay } }] },
            ],
          },
          select: { facilityId: true, startTime: true, endTime: true },
        }),
      ]);

    if (!activeCategory) {
      return { success: false, error: "This booking category is no longer available.", facilities: [] };
    }

    const facilitiesWithMaint = new Set(
      maintConflicts.map((m) => m.facilityId).filter((id): id is string => id !== null),
    );

    const slotsByFacility = new Map<string, typeof allTimeSlots>();
    for (const slot of allTimeSlots) {
      if (!slotsByFacility.has(slot.facilityId)) slotsByFacility.set(slot.facilityId, []);
      slotsByFacility.get(slot.facilityId)!.push(slot);
    }

    const pricingByFacility = new Map(allCategoryPricing.map((p) => [p.facilityId, p]));

    const bookingsByFacility = new Map<string, typeof allBookings>();
    for (const b of allBookings) {
      const fid = b.facilityId!;
      if (!bookingsByFacility.has(fid)) bookingsByFacility.set(fid, []);
      bookingsByFacility.get(fid)!.push(b);
    }

    const output: Array<{
      id: string;
      name: string;
      description: string | null;
      capacity: number;
      price: number;
      amenities: string[];
      availableDays: number[];
      acUsageFee: number;
      requiresBookingTerms: boolean;
      requiresItemBookingTerms: boolean;
    }> = [];

    for (const facility of facilities) {
      if (facilitiesWithMaint.has(facility.id)) continue;

      const timeSlots = slotsByFacility.get(facility.id) ?? [];
      if (timeSlots.length === 0) continue;

      const categoryPricing = pricingByFacility.get(facility.id);
      if (!categoryPricing) continue;

      const existingBookings = bookingsByFacility.get(facility.id) ?? [];

      // Check if at least one slot is bookable (mirrors getFacilityAvailability logic)
      let hasBookableSlot = false;
      for (const slot of timeSlots) {
        if (slotStartsBeforeLeadTime(date, slot.startTime, leadTimeHours)) continue;

        const slotStartMin = toMinutes(slot.startTime);
        const slotEndMin   = toMinutes(slot.endTime);

        const overlapping = existingBookings.filter((b) => {
          const bStartMin = b.startTime.getHours() * 60 + b.startTime.getMinutes();
          const bEndMin   = b.endTime.getHours() * 60 + b.endTime.getMinutes();
          return bookingOverlapsSlot(bStartMin, bEndMin, slotStartMin, slotEndMin);
        }).length;

        if (overlapping < slot.maxBookings) {
          hasBookableSlot = true;
          break;
        }
      }
      if (!hasBookableSlot) continue;

      output.push({
        id: facility.id,
        name: facility.name,
        description: facility.description,
        capacity: facility.capacity,
        price: Number(facility.pricing[0]?.price ?? 0),
        acUsageFee: Number(facility.acUsageFee ?? 0),
        amenities: facility.amenities,
        availableDays: facility.availableDays,
        requiresBookingTerms: facility.requiresBookingTerms,
        requiresItemBookingTerms: facility.requiresItemBookingTerms,
      });
    }

    return { success: true, facilities: output };
  } catch (error) {
    console.error("Error fetching facilities by category/date:", error);
    return {
      success: false,
      error: "Failed to fetch facilities for this category and date",
      facilities: [],
    };
  }
}

/**
 * Check if a specific time range is available
 */
export async function checkTimeRangeAvailability(
  facilityId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
) {
  try {
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        facilityId,
        deletedAt: null,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    const isAvailable = conflictingBookings.length === 0;

    return {
      success: true,
      isAvailable,
      conflictingBookings: conflictingBookings.length,
    };
  } catch (error) {
    console.error("Error checking availability:", error);
    return {
      success: false,
      error: "Failed to check availability",
      isAvailable: false,
    };
  }
}

export async function estimateFacilityBookingAmount(
  facilityId: string,
  category: string,
  startTime: Date,
  endTime: Date,
  useAirConditioner = false,
) {
  try {
    if (!category) {
      return {
        success: false,
        error: "Event category is required.",
      };
    }

    const [pricing, facility] = await Promise.all([
      prisma.facilityPricing.findFirst({
        where: {
          facilityId,
          category,
          isActive: true,
        },
      }),
      prisma.facility.findUnique({
        where: { id: facilityId },
        select: { acUsageFee: true },
      }),
    ]);

    if (!facility) {
      return {
        success: false,
        error: "Facility not found",
      };
    }

    if (!pricing) {
      return {
        success: false,
        error: "No pricing configured for this booking category",
      };
    }

    const dayOfWeek = startTime.getDay();
    const start = `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`;
    const end = `${String(endTime.getHours()).padStart(2, "0")}:${String(endTime.getMinutes()).padStart(2, "0")}`;

    const slot = await prisma.facilityTimeSlot.findFirst({
      where: {
        facilityId,
        dayOfWeek,
        isActive: true,
        category,
        startTime: { lte: start },
        endTime: { gte: end },
      },
      orderBy: { startTime: "asc" },
    });

    if (!slot) {
      return {
        success: false,
        error: "No category-specific slot mapping found for the selected date/time",
      };
    }

    // Zero out price only if explicitly configured: slot.isFree or day is in freeDays.
    // Weekdays are NOT automatically free.
    if (slot?.isFree || pricing.freeDays.includes(dayOfWeek)) {
      const acFee = useAirConditioner ? Number(facility.acUsageFee ?? 0) : 0;
      return {
        success: true,
        totalAmount: acFee,
        price: 0,
        acUsageFee: acFee,
      };
    }

    const unitPrice = slot?.pricePerHourOverride !== null && slot?.pricePerHourOverride !== undefined
      ? Number(slot.pricePerHourOverride)
      : Number(pricing.price);
    const acFee = useAirConditioner ? Number(facility.acUsageFee ?? 0) : 0;

    return {
      success: true,
      totalAmount: unitPrice + acFee,
      price: unitPrice,
      acUsageFee: acFee,
    };
  } catch (error) {
    console.error("Error estimating booking amount:", error);
    return {
      success: false,
      error: "Failed to estimate booking amount",
    };
  }
}

// Helper function to convert "HH:MM" to minutes since midnight
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}
