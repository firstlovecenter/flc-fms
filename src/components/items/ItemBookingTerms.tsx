"use client";

import { useBookingContent } from "@/hooks/use-booking-content";
import { Card } from "@/components/ui/card";

type ItemBookingTermsProps = {
  title?: string;
};

export default function ItemBookingTerms({
  title,
}: ItemBookingTermsProps) {
  const content = useBookingContent();
  const sectionTitle = title ?? content.itemTermsTitle;

  return (
    <Card className="p-4">
      <details open={false}>
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--navy)]">{sectionTitle}</span>
        <span className="text-xs text-[var(--muted)]">Click to expand</span>
      </summary>

      <div className="mt-4 space-y-3 text-sm text-[var(--slate)] leading-relaxed">
        <p>{content.itemTermsIntro}</p>
        <ol className="list-decimal pl-5 space-y-2">
          {content.itemTerms.map((term, index) => (
            <li key={`item-term-${index}`}>{term}</li>
          ))}
        </ol>
      </div>
      </details>
    </Card>
  );
}
