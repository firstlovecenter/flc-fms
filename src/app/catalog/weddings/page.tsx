export const dynamic = "force-dynamic";

import { getCeremonyVenueConfigs } from "@/actions/ceremony-venue.actions";
import { getSiteSettings } from "@/actions/site-settings.actions";
import CeremonyCatalogClient from "@/components/public/CeremonyCatalogClient";
import PublicShell from "@/components/public/PublicShell";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Wedding Venues",
};

export default async function WeddingCatalogPage() {
  const [configs, siteSettings] = await Promise.all([
    getCeremonyVenueConfigs("WEDDING"),
    getSiteSettings(),
  ]);

  return (
    <PublicShell
      layout="top"
      current="weddings"
      maxWidth="xl"
      officePhone={siteSettings.officePhone || undefined}
      officeEmail={siteSettings.officeEmail || undefined}
    >
      <div className="space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-body-sm font-medium text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors group"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" aria-hidden />
          Back to Home
        </Link>
        <PageHeader
          title="Wedding Venues"
          description={
            <>
              Beautiful spaces for your special day. All weddings are booked via a payment code —
              select a venue and enter your code to proceed.{" "}
              <Link href="/ceremony-code-request" className="link-gold">
                Request a code →
              </Link>
            </>
          }
        />
        <CeremonyCatalogClient type="WEDDING" configs={configs} />
      </div>
    </PublicShell>
  );
}
