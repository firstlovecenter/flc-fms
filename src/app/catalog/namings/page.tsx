export const dynamic = "force-dynamic";

import { getCeremonyVenueConfigs } from "@/actions/ceremony-venue.actions";
import { getSiteSettings } from "@/actions/site-settings.actions";
import CeremonyCatalogClient from "@/components/public/CeremonyCatalogClient";
import PublicTopNav from "@/components/public/PublicTopNav";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Naming Ceremony Venues",
};

export default async function NamingCatalogPage() {
  const [configs, siteSettings] = await Promise.all([
    getCeremonyVenueConfigs("NAMING"),
    getSiteSettings(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--cream)] dark:bg-transparent relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none -z-0">
        <div className="absolute top-[10%] -right-[10%] w-1/2 h-1/2 rounded-full bg-[var(--gold)]/5 blur-[100px]" />
        <div className="absolute top-[40%] -left-[10%] w-1/2 h-1/2 rounded-full bg-[var(--navy)]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full">
        <PublicTopNav current="namings" officePhone={siteSettings.officePhone || undefined} officeEmail={siteSettings.officeEmail || undefined} />

        <main className="max-w-[1200px] mx-auto px-5 md:px-8 py-10 md:py-16 space-y-8 animate-fade-in">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors mb-6 group"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Home
            </Link>
            <h1 className="page-title text-3xl md:text-4xl">Naming Ceremony Venues</h1>
            <p className="page-subtitle mt-2 max-w-2xl">
              Welcoming spaces for your child&apos;s outdooring and naming ceremony. All bookings
              require a payment code — select a venue and enter your code to proceed.{" "}
              <Link href="/ceremony-code-request" className="link-gold">
                Request a code →
              </Link>
            </p>
          </div>

          <CeremonyCatalogClient type="NAMING" configs={configs} />
        </main>
      </div>
    </div>
  );
}
