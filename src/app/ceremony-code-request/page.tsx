import PublicShell from "@/components/public/PublicShell";
import CeremonyCodeRequestForm from "@/components/public/CeremonyCodeRequestForm";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSiteSettings } from "@/actions/site-settings.actions";

export const metadata = {
  title: "Request a Ceremony Booking Code",
};

export default async function CeremonyCodeRequestPage() {
  const siteSettings = await getSiteSettings();
  return (
    <PublicShell
      layout="top"
      current="ceremony-request"
      maxWidth="md"
      officePhone={siteSettings.officePhone || undefined}
      officeEmail={siteSettings.officeEmail || undefined}
    >
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-body-sm font-medium text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-[#fff] transition-colors group"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" aria-hidden />
          Back to Home
        </Link>
        <PageHeader
          title="Request a Booking Code"
          description="To book a wedding or naming ceremony, payment must be made first. Submit your details below and we'll send your unique booking code once payment is confirmed."
        />
        <CeremonyCodeRequestForm />
      </div>
    </PublicShell>
  );
}
