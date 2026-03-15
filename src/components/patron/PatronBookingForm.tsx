"use client";

import GuestBookingForm from "@/components/public/GuestBookingForm";

type Facility = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  pricePerHour: unknown;
  amenities: string[];
  availableDays: number[];
};

export default function PatronBookingForm({
  facilities,
  defaultFacilityId,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
}) {
  return <GuestBookingForm facilities={facilities} defaultFacilityId={defaultFacilityId} mode="patron" />;
}
