"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_BOOKING_CONTENT,
  type BookingContentPayload,
} from "@/lib/booking-content-defaults";

export function useBookingContent() {
  const [content, setContent] = useState<BookingContentPayload>(DEFAULT_BOOKING_CONTENT);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/public/booking-content", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const json = (await response.json()) as BookingContentPayload;
        if (!cancelled) {
          setContent({ ...DEFAULT_BOOKING_CONTENT, ...json });
        }
      } catch {
        // Keep defaults when API is unavailable.
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return content;
}
