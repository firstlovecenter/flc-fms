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

export default function PatronBookingForm({
  facilities,
  defaultFacilityId,
  defaultContactEmail,
  officePhone,
  officeEmail,
}: {
  facilities: Facility[];
  defaultFacilityId?: string;
  defaultContactEmail?: string;
  officePhone?: string;
  officeEmail?: string;
}) {
  return (
    <GuestBookingForm
      facilities={facilities}
      defaultFacilityId={defaultFacilityId}
      defaultContactEmail={defaultContactEmail}
      mode="patron"
      officePhone={officePhone}
      officeEmail={officeEmail}
    />
  );
}
