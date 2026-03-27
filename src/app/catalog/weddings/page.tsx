export const dynamic = "force-dynamic";

import { getCeremonyVenueConfigs } from "@/actions/ceremony-venue.actions";
import { getSiteSettings } from "@/actions/site-settings.actions";
import CeremonyCatalogClient from "@/components/public/CeremonyCatalogClient";
import PublicTopNav from "@/components/public/PublicTopNav";
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
    <div style={{ minHeight: "100vh", background: "var(--cream)", position: "relative", overflow: "hidden" }}>
      {/* Background decorations */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[var(--gold)]/5 blur-[100px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--navy)]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full">
        <PublicTopNav current="weddings" officePhone={siteSettings.officePhone || undefined} officeEmail={siteSettings.officeEmail || undefined} />

        <main className="max-w-[1200px] mx-auto px-5 md:px-8 py-10 md:py-16 space-y-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[var(--navy)] transition-colors mb-6 group"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Home
            </Link>
            <h1 className="page-title text-3xl md:text-4xl">Wedding Venues</h1>
            <p className="page-subtitle mt-2 max-w-2xl">
              Beautiful spaces for your special day. All weddings are booked via a payment code —
              select a venue and enter your code to proceed.{" "}
              <Link href="/ceremony-code-request" className="text-[var(--gold)] hover:underline font-semibold">
                Request a code →
              </Link>
            </p>
          </div>

          <CeremonyCatalogClient type="WEDDING" configs={configs} />
        </main>
      </div>
    </div>
  );
}
