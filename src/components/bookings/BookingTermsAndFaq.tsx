"use client";

import { useBookingContent } from "@/hooks/use-booking-content";

type BookingTermsAndFaqProps = {
  title?: string;
};

export default function BookingTermsAndFaq({
  title,
}: BookingTermsAndFaqProps) {
  const content = useBookingContent();
  const sectionTitle = title ?? content.bookingTermsTitle;

  return (
    <details className="card p-4" open={false}>
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--navy)]">{sectionTitle}</span>
        <span className="text-xs text-[var(--muted)]">Click to expand</span>
      </summary>

      <div className="mt-4 space-y-4 text-sm text-[var(--slate)] leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-semibold text-[var(--navy)]">Terms and Conditions</h3>
          <p>{content.bookingTermsIntro}</p>
          <ol className="list-decimal pl-5 space-y-2">
            {content.bookingTerms.map((term, index) => (
              <li key={`${term.title}-${index}`}>
                <strong>{term.title}:</strong>{" "}
                {term.body}
                {term.bullets && term.bullets.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {term.bullets.map((bullet, bulletIndex) => (
                      <li key={`${term.title}-bullet-${bulletIndex}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

      </div>
    </details>
  );
}
