"use server";

import { prisma } from "@/lib/db/prisma";

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

/**
 * Get available time slots for a facility on a specific date.
 * Returns empty slots + a maintenanceWindow if the date falls within scheduled maintenance.
 */
export async function getFacilityAvailability(
  facilityId: string,
  date: Date,
  category?: string
) {
  try {
    if (!category) {
      return {
        success: false,
        error: "Event category is required.",
        slots: [],
      };
    }

    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

    // Mondays are office off-days (Sabbath) — no availability
    if (dayOfWeek === 1) {
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

    const [maintConflict, facility, categoryPricing] = await Promise.all([
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
    ]);

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
        // Count bookings that overlap with this slot
        const slotStart = parseTime(slot.startTime);
        const slotEnd = parseTime(slot.endTime);

        const overlappingBookings = existingBookings.filter((booking) => {
          const bookingStart = booking.startTime.getHours() * 60 + booking.startTime.getMinutes();
          const bookingEnd = booking.endTime.getHours() * 60 + booking.endTime.getMinutes();

          // Check if booking overlaps with slot
          return (
            (bookingStart >= slotStart && bookingStart < slotEnd) ||
            (bookingEnd > slotStart && bookingEnd <= slotEnd) ||
            (bookingStart <= slotStart && bookingEnd >= slotEnd)
          );
        });

        const currentBookings = overlappingBookings.length;
        const isAvailable = currentBookings < slot.maxBookings;
        const basePrice = categoryPricing2 ? Number(categoryPricing2.price) : 0;
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
    const pricingRecords = await prisma.facilityPricing.findMany({
      where: {
        facilityId,
        isActive: true,
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
export async function getBookableFacilitiesByCategoryDate(category: string, date: Date) {
  try {
    if (!category) {
      return { success: false, error: "Event category is required.", facilities: [] };
    }

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1) {
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

    const output: Array<{
      id: string;
      name: string;
      description: string | null;
      capacity: number;
      price: number;
      amenities: string[];
      availableDays: number[];
    }> = [];

    for (const facility of facilities) {
      const maintConflict = await prisma.maintenanceRequest.findFirst({
        where: {
          facilityId: facility.id,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          scheduledStart: { not: null, lt: endOfDay },
          scheduledEnd: { not: null, gt: startOfDay },
        },
        select: { id: true },
      });
      if (maintConflict) continue;

      const availability = await getFacilityAvailability(facility.id, date, category);
      if (!availability.success) continue;
      const hasBookableSlot = (availability.slots || []).some((s) => s.isAvailable);
      if (!hasBookableSlot) continue;

      output.push({
        id: facility.id,
        name: facility.name,
        description: facility.description,
        capacity: facility.capacity,
        price: Number(facility.pricing[0]?.price ?? 0),
        amenities: facility.amenities,
        availableDays: facility.availableDays,
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
) {
  try {
    if (!category) {
      return {
        success: false,
        error: "Event category is required.",
      };
    }

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

    if (slot?.isFree || pricing.freeDays.includes(dayOfWeek)) {
      return {
        success: true,
        totalAmount: 0,
        price: 0,
      };
    }

    const unitPrice = slot?.pricePerHourOverride !== null && slot?.pricePerHourOverride !== undefined
      ? Number(slot.pricePerHourOverride)
      : Number(pricing.price);
    const hours = (endTime.getTime() - startTime.getTime()) / 3_600_000;

    return {
      success: true,
      totalAmount: unitPrice * hours,
      price: unitPrice,
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
