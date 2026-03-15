import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "skaduteye@gmail.com" },
    update: {},
    create: {
      email: "skaduteye@gmail.com",
      passwordHash: await bcrypt.hash("SuperAdmin@123", 12),
      name: "Super Administrator",
      role: "SUPER_ADMIN",
    },
  });
  console.log("✅ Super Admin:", superAdmin.email);

  // Facility Manager
  const fm = await prisma.user.upsert({
    where: { email: "fm@firstlovecenter.com" },
    update: {},
    create: {
      email: "fm@firstlovecenter.com",
      passwordHash: await bcrypt.hash("FmPassword@123", 12),
      name: "Gold Opoku",
      role: "FACILITY_MANAGER",
    },
  });

  // Vicar
  const vicar = await prisma.user.upsert({
    where: { email: "vicar@firstlovecenter.com" },
    update: {},
    create: {
      email: "vicar@firstlovecenter.com",
      passwordHash: await bcrypt.hash("VicarPassword@123", 12),
      name: "Bicknell Aidoo",
      role: "VICAR",
      permissions: {
        canCreateBookings: true,
        canCancelBookings: false,
        canViewFinancials: false,
        canSubmitExpenses: true,
        canCreateMaintenance: true,
        canManageFacilities: false,
        canViewPatrons: true,
        canCreateEvents: false,
      },
    },
  });

  console.log("✅ Staff:", fm.name, "|", vicar.name);

  // Facilities
  const auditorium = await prisma.facility.upsert({
    where: { id: "nathaniel-cathedral-seed" },
    update: {},
    create: {
      id: "nathaniel-cathedral-seed",
      name: "Nathaniel Cathedral",
      description: "5000-seat main worship auditorium with state-of-the-art sound and lighting",
      capacity: 5000,
      amenities: ["AC", "Sound System", "LED Screens", "Stage Lighting"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const confHall = await prisma.facility.upsert({
    where: { id: "tl-osborne-chapel-seed" },
    update: {},
    create: {
      id: "tl-osborne-chapel-seed",
      name: "T.L. Osborne Chapel",
      description: "250-seat chapel room perfect for weddings and services, with elegant decor and intimate atmosphere",
      capacity: 250,
      amenities: ["AC", "Screens", "Instruments", "Microphone"],
      availableDays: [1, 2, 3, 4, 5],
    },
  });

  const fellowship1 = await prisma.facility.upsert({
    where: { id: "benson-idahosa-seed" },
    update: {},
    create: {
      id: "benson-idahosa-seed",
      name: "Benson Idahosa Chapel",
      description: "Multi-purpose fellowship space with kitchen facilities",
      capacity: 500,
      amenities: ["AC", "Kitchen", "Tables", "Chairs"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const fellowship2 = await prisma.facility.upsert({
    where: { id: "fellowship-hall-seed-1" },
    update: {},
    create: {
      id: "fellowship-hall-seed-1",
      name: "Fellowship Hall 1",
      description: "Multi-purpose fellowship space with kitchen facilities",
      capacity: 500,
      amenities: ["AC", "Kitchen", "Tables", "Chairs"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const fellowship3 = await prisma.facility.upsert({
    where: { id: "fellowship-hall-seed-2" },
    update: {},
    create: {
      id: "fellowship-hall-seed-2",
      name: "Fellowship Hall 2",
      description: "Multi-purpose fellowship space with kitchen facilities",
      capacity: 500,
      amenities: ["AC", "Kitchen", "Tables", "Chairs"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const fellowship4 = await prisma.facility.upsert({
    where: { id: "fellowship-hall-seed-3" },
    update: {},
    create: {
      id: "fellowship-hall-seed-3",
      name: "Fellowship Hall 3",
      description: "Multi-purpose fellowship space with kitchen facilities",
      capacity: 500,
      amenities: ["AC", "Kitchen", "Tables", "Chairs"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const fellowship5 = await prisma.facility.upsert({
    where: { id: "fellowship-hall-seed-4" },
    update: {},
    create: {
      id: "fellowship-hall-seed-4",
      name: "Fellowship Hall 4",
      description: "Multi-purpose fellowship space with kitchen facilities",
      capacity: 500,
      amenities: ["AC", "Kitchen", "Tables", "Chairs"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const fellowship6 = await prisma.facility.upsert({
    where: { id: "fellowship-hall-seed-5" },
    update: {},
    create: {
      id: "fellowship-hall-seed-5",
      name: "Fellowship Hall 5",
      description: "Multi-purpose fellowship space with kitchen facilities",
      capacity: 500,
      amenities: ["AC", "Kitchen", "Tables", "Chairs"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const fellowship7 = await prisma.facility.upsert({
    where: { id: "fellowship-hall-seed-6" },
    update: {},
    create: {
      id: "fellowship-hall-seed-6",
      name: "Fellowship Hall 6",
      description: "Multi-purpose fellowship space with kitchen facilities",
      capacity: 500,
      amenities: ["AC", "Kitchen", "Tables", "Chairs"],
      availableDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  console.log("✅ Facilities seeded");

  // Facility Pricing (Category-based)
  const pricingData = [
    // Main Auditorium - Premium pricing for events
    { facilityId: auditorium.id, category: "CHURCH_SERVICE", price: 500, freeDays: [0], description: "Free on Sundays for church services" },
    { facilityId: auditorium.id, category: "WEDDING", price: 800, description: "Premium wedding package" },
    { facilityId: auditorium.id, category: "CONCERT", price: 1000, description: "Concert/performance rate" },
    { facilityId: auditorium.id, category: "CONFERENCE", price: 600, description: "Corporate conference" },
    
    // Conference Hall - Business focus
    { facilityId: confHall.id, category: "MEETING", price: 150, description: "Standard meeting rate" },
    { facilityId: confHall.id, category: "WORKSHOP", price: 200, description: "Workshop/training" },
    { facilityId: confHall.id, category: "CONFERENCE", price: 250, description: "Full conference" },
    
    // Fellowship Hall - Community events
    { facilityId: fellowship1.id, category: "CHURCH_SERVICE", price: 150, freeDays: [0, 3], description: "Free on Sundays and Wednesdays for church activities" },
    { facilityId: fellowship1.id, category: "BIRTHDAY_PARTY", price: 180, description: "Party package" },
    { facilityId: fellowship1.id, category: "MEETING", price: 120, description: "Community meetings" },
    { facilityId: fellowship1.id, category: "REHEARSAL", price: 100, description: "Rehearsal space" },
  ];

  for (const pricing of pricingData) {
    await prisma.facilityPricing.upsert({
      where: {
        facilityId_category: {
          facilityId: pricing.facilityId,
          category: pricing.category as any,
        },
      },
      update: {},
      create: pricing as any,
    });
  }

  console.log("✅ Facility pricing seeded");

  // Facility Time Slots with Pricing Configuration
  const timeSlotsData: any[] = [
    // Main Auditorium - Strict slots for Sundays (services, FREE), flexible on other days
    { facilityId: auditorium.id, category: "CHURCH_SERVICE", dayOfWeek: 0, startTime: "08:00", endTime: "11:00", label: "First Service", isFlexible: false, isFree: true, pricePerHourOverride: null },
    { facilityId: auditorium.id, category: "CHURCH_SERVICE", dayOfWeek: 0, startTime: "11:30", endTime: "14:30", label: "Second Service", isFlexible: false, isFree: true, pricePerHourOverride: null },
    // Weekday daytime - standard rate
    { facilityId: auditorium.id, category: null, dayOfWeek: 1, startTime: "08:00", endTime: "17:00", label: "Weekday Daytime", isFlexible: true, isFree: false, pricePerHourOverride: 400 },
    // Weekday evening - premium rate
    { facilityId: auditorium.id, category: null, dayOfWeek: 1, startTime: "17:00", endTime: "22:00", label: "Evening Premium", isFlexible: true, isFree: false, pricePerHourOverride: 600 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 2, startTime: "08:00", endTime: "17:00", label: "Weekday Daytime", isFlexible: true, isFree: false, pricePerHourOverride: 400 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 2, startTime: "17:00", endTime: "22:00", label: "Evening Premium", isFlexible: true, isFree: false, pricePerHourOverride: 600 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 3, startTime: "08:00", endTime: "17:00", label: "Weekday Daytime", isFlexible: true, isFree: false, pricePerHourOverride: 400 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 3, startTime: "17:00", endTime: "22:00", label: "Evening Premium", isFlexible: true, isFree: false, pricePerHourOverride: 600 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 4, startTime: "08:00", endTime: "17:00", label: "Weekday Daytime", isFlexible: true, isFree: false, pricePerHourOverride: 400 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 4, startTime: "17:00", endTime: "22:00", label: "Evening Premium", isFlexible: true, isFree: false, pricePerHourOverride: 600 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 5, startTime: "08:00", endTime: "17:00", label: "Friday Daytime", isFlexible: true, isFree: false, pricePerHourOverride: 400 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 5, startTime: "17:00", endTime: "22:00", label: "Friday Evening (Premium)", isFlexible: true, isFree: false, pricePerHourOverride: 700 },
    { facilityId: auditorium.id, category: null, dayOfWeek: 6, startTime: "10:00", endTime: "22:00", label: "Saturday (Premium Weekend)", isFlexible: true, isFree: false, pricePerHourOverride: 800 },

    // Conference Hall - Business hours, weekday midday special rate
    { facilityId: confHall.id, category: null, dayOfWeek: 1, startTime: "08:00", endTime: "18:00", label: "Business Hours", isFlexible: true, isFree: false, pricePerHourOverride: 100 },
    { facilityId: confHall.id, category: null, dayOfWeek: 2, startTime: "08:00", endTime: "18:00", label: "Business Hours", isFlexible: true, isFree: false, pricePerHourOverride: 100 },
    { facilityId: confHall.id, category: null, dayOfWeek: 3, startTime: "08:00", endTime: "18:00", label: "Business Hours", isFlexible: true, isFree: false, pricePerHourOverride: 100 },
    { facilityId: confHall.id, category: null, dayOfWeek: 4, startTime: "08:00", endTime: "18:00", label: "Business Hours", isFlexible: true, isFree: false, pricePerHourOverride: 100 },
    { facilityId: confHall.id, category: null, dayOfWeek: 5, startTime: "08:00", endTime: "18:00", label: "Business Hours", isFlexible: true, isFree: false, pricePerHourOverride: 100 },

    // Fellowship Hall - FREE Sunday services, flexible other days with tiered pricing
    { facilityId: fellowship1.id, category: "CHURCH_SERVICE", dayOfWeek: 0, startTime: "14:00", endTime: "17:00", label: "Sunday Fellowship", isFlexible: false, isFree: true, pricePerHourOverride: null },
    { facilityId: fellowship1.id, category: "CHURCH_SERVICE", dayOfWeek: 0, startTime: "18:00", endTime: "21:00", label: "Evening Service", isFlexible: false, isFree: true, pricePerHourOverride: null },
    // Weekday off-peak - reduced rate for community use
    { facilityId: fellowship1.id, category: null, dayOfWeek: 1, startTime: "09:00", endTime: "16:00", label: "Weekday Off-Peak", isFlexible: true, isFree: false, pricePerHourOverride: 120 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 1, startTime: "16:00", endTime: "22:00", label: "Weekday Evening", isFlexible: true, isFree: false, pricePerHourOverride: 180 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 2, startTime: "09:00", endTime: "16:00", label: "Weekday Off-Peak", isFlexible: true, isFree: false, pricePerHourOverride: 120 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 2, startTime: "16:00", endTime: "22:00", label: "Weekday Evening", isFlexible: true, isFree: false, pricePerHourOverride: 180 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 3, startTime: "09:00", endTime: "16:00", label: "Weekday Off-Peak", isFlexible: true, isFree: false, pricePerHourOverride: 120 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 3, startTime: "16:00", endTime: "22:00", label: "Weekday Evening", isFlexible: true, isFree: false, pricePerHourOverride: 180 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 4, startTime: "09:00", endTime: "16:00", label: "Weekday Off-Peak", isFlexible: true, isFree: false, pricePerHourOverride: 120 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 4, startTime: "16:00", endTime: "22:00", label: "Weekday Evening", isFlexible: true, isFree: false, pricePerHourOverride: 180 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 5, startTime: "09:00", endTime: "16:00", label: "Friday Off-Peak", isFlexible: true, isFree: false, pricePerHourOverride: 120 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 5, startTime: "16:00", endTime: "22:00", label: "Friday Evening (Premium)", isFlexible: true, isFree: false, pricePerHourOverride: 220 },
    { facilityId: fellowship1.id, category: null, dayOfWeek: 6, startTime: "09:00", endTime: "22:00", label: "Saturday (Weekend)", isFlexible: true, isFree: false, pricePerHourOverride: 250 },
  ];

  await prisma.facilityTimeSlot.createMany({
    data: timeSlotsData,
    skipDuplicates: true,
  });

  console.log("✅ Facility time slots seeded");
  console.log("\n🎉 Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Super Admin:       skaduteye@gmail.com              / SuperAdmin@123");
  console.log("  Facility Manager:  fm@firstlovecenter.com           / FmPassword@123");
  console.log("  Vicar:             vicar@firstlovecenter.com        / VicarPassword@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
