"use client";

import { useBookingContent } from "@/hooks/use-booking-content";
import { Card } from "@/components/ui/card";

type BookingFaqProps = {
  title?: string;
};

export default function BookingFaq({
  title,
}: BookingFaqProps) {
  const content = useBookingContent();
  const sectionTitle = title ?? content.bookingFaqTitle;

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--navy)]">{sectionTitle}</h2>

      <ol className="list-decimal pl-5 space-y-2 text-sm text-[var(--slate)] leading-relaxed">
        {content.bookingFaq.map((item, index) => (
          <li key={`${item.question}-${index}`}>
            <strong>{item.question}</strong> {item.answer}
          </li>
        ))}
      </ol>
    </Card>
  );
}
