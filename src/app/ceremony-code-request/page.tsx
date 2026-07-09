import PublicShell from "@/components/public/PublicShell";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import { ChevronLeft, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { getSiteSettings } from "@/actions/site-settings.actions";

export const metadata = {
  title: "Request a Ceremony Booking Code",
};

export default async function CeremonyCodeRequestPage() {
  const siteSettings = await getSiteSettings();
  const officePhone = siteSettings.officePhone || undefined;
  const officeEmail = siteSettings.officeEmail || undefined;

  return (
    <PublicShell
      layout="top"
      current="ceremony-request"
      maxWidth="md"
      officePhone={officePhone}
      officeEmail={officeEmail}
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
          description="Wedding and naming ceremony booking codes are issued in person. Please contact our office to arrange payment and receive your code."
        />
        <Card className="p-8 space-y-5 max-w-lg mx-auto text-center">
          {officePhone ? (
            <a
              href={`tel:${officePhone}`}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full gap-2")}
            >
              <Phone size={18} /> Call {officePhone}
            </a>
          ) : (
            <p className="text-sm text-[var(--slate)]">
              Please visit our office to request your booking code.
            </p>
          )}
          {officeEmail && (
            <a
              href={`mailto:${officeEmail}`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2")}
            >
              <Mail size={18} /> Email {officeEmail}
            </a>
          )}
          <p className="text-xs text-[var(--muted)]">
            Once your payment is confirmed, we&apos;ll send your booking code via SMS and email.
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
