import { getCeremonyVenueConfigs } from "@/actions/ceremony-venue.actions";
import CeremonyCatalogClient from "@/components/public/CeremonyCatalogClient";

export const metadata = {
  title: "Naming Ceremony Venues",
};

export default async function NamingCatalogPage() {
  const configs = await getCeremonyVenueConfigs("NAMING");

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="page-title">Naming Ceremony Venues</h1>
        <p className="page-subtitle mt-1">
          Welcoming spaces for your child&apos;s outdooring and naming ceremony.
          All bookings require a payment code — select a venue and enter your
          code to proceed.
        </p>
      </div>
      <CeremonyCatalogClient type="NAMING" configs={configs} />
    </div>
  );
}
