import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import PublicSplitShell from "@/components/public/PublicSplitShell";
import BookingFaq from "@/components/bookings/BookingFaq";

import { Card } from "@/components/ui/card";

export default function FaqPage() {
  return (
    <PublicSplitShell
      current="faq"
      eyebrow="Help Center"
      title="Booking FAQs"
      subtitle={
        <>
          Quick answers to common booking questions. For policy details, review the Terms and
          Conditions in the booking form before submitting your request.
        </>
      }
    >
      <div className="space-y-6">
        <BookingFaq title="Frequently Asked Questions" />

        <Card className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-[var(--slate)]">
            Ready to continue with your reservation?
          </p>
          <div className="flex gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
              Back to Home
            </Link>
            <Link href="/guest/book" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
              Start Booking <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
      </div>
    </PublicSplitShell>
  );
}
