"use client";

import GuestBookingForm from "@/components/public/GuestBookingForm";

type Facility = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  acUsageFee: number;
  pricePerHour: unknown;
  amenities: string[];
  availableDays: number[];
};

export default function BookingForm({
  facilities,
  defaultFacilityId,
  currentUserRole,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
  currentUserRole?: string;
}) {
  return <GuestBookingForm facilities={facilities} defaultFacilityId={defaultFacilityId} mode="staff" currentUserRole={currentUserRole} />;
}
