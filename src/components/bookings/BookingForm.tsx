"use client";

import GuestBookingForm from "@/components/public/GuestBookingForm";

type Facility = {
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
};

export default function BookingForm({
  facilities,
  defaultFacilityId,
  currentUserRole,
  ceremonyDays,
  isCeremonyBooking,
  defaultCategory,
  ceremonyFlatPrice,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
  currentUserRole?: string;
  ceremonyDays?: string[];
  isCeremonyBooking?: boolean;
  defaultCategory?: string;
  ceremonyFlatPrice?: number;
}) {
  return (
    <GuestBookingForm
      facilities={facilities}
      defaultFacilityId={defaultFacilityId}
      mode="staff"
      currentUserRole={currentUserRole}
      ceremonyDays={ceremonyDays}
      isCeremonyBooking={isCeremonyBooking}
      defaultCategory={defaultCategory}
      ceremonyFlatPrice={ceremonyFlatPrice}
    />
  );
}
