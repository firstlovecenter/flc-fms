import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import PublicShell from "@/components/public/PublicShell";
import VisitorHero from "@/components/public/VisitorHero";
import BookingFaq from "@/components/bookings/BookingFaq";

export default function FaqPage() {
  return (
    <PublicShell
      current="faq"
      maxWidth="md"
      hero={
        <VisitorHero
          eyebrow={
            <>
              <LifeBuoy size={14} aria-hidden /> Help
            </>
          }
          title="Questions, answered"
          subtitle="The things visitors ask most often. For the full policy, read the terms in the booking form before you send it."
        />
      }
    >
      <div className="space-y-6 pt-10">
        <BookingFaq title="Frequently asked questions" />

        <section className="flex flex-col gap-4 rounded-[var(--r-2xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--navy)]">
              Still need a hand?
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Tell us what is on your mind, or start planning and we will guide you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/feedback"
              className="text-sm font-semibold text-[var(--gold-muted)] underline-offset-4 hover:underline"
            >
              Share feedback
            </Link>
            <Link
              href="/guest/book"
              className={cn(buttonVariants({ variant: "default" }), "gap-2 px-6")}
            >
              Plan your visit <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
