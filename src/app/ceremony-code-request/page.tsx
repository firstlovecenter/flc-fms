import PublicTopNav from "@/components/public/PublicTopNav";
import CeremonyCodeRequestForm from "@/components/public/CeremonyCodeRequestForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSiteSettings } from "@/actions/site-settings.actions";

export const metadata = {
  title: "Request a Ceremony Booking Code",
};

export default async function CeremonyCodeRequestPage() {
  const siteSettings = await getSiteSettings();
  return (
    <div className="min-h-screen bg-[var(--cream)] dark:bg-transparent relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[var(--gold)]/5 blur-[100px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--navy)]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full">
        <PublicTopNav current="ceremony-request" officePhone={siteSettings.officePhone || undefined} officeEmail={siteSettings.officeEmail || undefined} />

        <main className="max-w-2xl mx-auto px-5 md:px-8 py-10 md:py-16 space-y-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[var(--navy)] transition-colors mb-6 group"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Home
            </Link>
            <h1 className="page-title text-3xl md:text-4xl">Request a Booking Code</h1>
            <p className="page-subtitle mt-2 max-w-lg">
              To book a wedding or naming ceremony, payment must be made first. Submit your details
              below and we&apos;ll send your unique booking code once payment is confirmed.
            </p>
          </div>

          <CeremonyCodeRequestForm />
        </main>
      </div>
    </div>
  );
}
