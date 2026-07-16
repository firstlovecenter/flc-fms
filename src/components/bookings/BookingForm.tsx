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
  currentStaffEmail,
  ceremonyDays,
  isCeremonyBooking,
  defaultCategory,
  ceremonyFlatPrice,
  allowCeremony,
  allowPriceOverride,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
  currentUserRole?: string;
  currentStaffEmail?: string;
  ceremonyDays?: string[];
  isCeremonyBooking?: boolean;
  defaultCategory?: string;
  ceremonyFlatPrice?: number;
  allowCeremony?: boolean;
  allowPriceOverride?: boolean;
}) {
  return (
    <GuestBookingForm
      facilities={facilities}
      defaultFacilityId={defaultFacilityId}
      mode="staff"
      currentUserRole={currentUserRole}
      currentStaffEmail={currentStaffEmail}
      ceremonyDays={ceremonyDays}
      isCeremonyBooking={isCeremonyBooking}
      defaultCategory={defaultCategory}
      ceremonyFlatPrice={ceremonyFlatPrice}
      allowCeremony={allowCeremony}
      allowPriceOverride={allowPriceOverride}
    />
  );
}
