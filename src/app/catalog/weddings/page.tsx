import { getCeremonyVenueConfigs } from "@/actions/ceremony-venue.actions";
import CeremonyCatalogClient from "@/components/public/CeremonyCatalogClient";

export const metadata = {
  title: "Wedding Venues",
};

export default async function WeddingCatalogPage() {
  const configs = await getCeremonyVenueConfigs("WEDDING");

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="page-title">Wedding Venues</h1>
        <p className="page-subtitle mt-1">
          Beautiful spaces for your special day. All weddings are booked via a
          payment code — select a venue and enter your code to proceed.
        </p>
      </div>
      <CeremonyCatalogClient type="WEDDING" configs={configs} />
    </div>
  );
}
