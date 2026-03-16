import "server-only";

import {
  DEFAULT_BOOKING_CONTENT,
  type BookingContentPayload,
  type BookingFaqItem,
  type BookingTermItem,
} from "@/lib/booking-content-defaults";
import { sanityClient, isSanityEnabled } from "@/lib/sanity/client";
import { getSanityWriteClient, isSanityWriteEnabled } from "@/lib/sanity/server-client";

const BOOKING_CONTENT_ID = "booking-content";

const BOOKING_CONTENT_QUERY = `*[_type == "bookingContent" && _id == $id][0]{
  bookingTermsTitle,
  bookingTermsIntro,
  bookingTerms,
  bookingFaqTitle,
  bookingFaq,
  itemTermsTitle,
  itemTermsIntro,
  itemTerms
}`;

function sanitizeFaq(items: unknown): BookingFaqItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        question: String(record?.question ?? "").trim(),
        answer: String(record?.answer ?? "").trim(),
      };
    })
    .filter((item) => item.question && item.answer);
}

function sanitizeTerms(items: unknown): BookingTermItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const record = item as Record<string, unknown>;
      const bullets = Array.isArray(record?.bullets)
        ? (record.bullets as unknown[])
            .map((b) => String(b ?? "").trim())
            .filter(Boolean)
        : [];
      return {
        title: String(record?.title ?? "").trim(),
        body: String(record?.body ?? "").trim(),
        bullets,
      };
    })
    .filter((item) => item.title);
}

function sanitizeItemTerms(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizePayload(raw: Partial<BookingContentPayload> | null | undefined): BookingContentPayload {
  return {
    bookingTermsTitle: String(raw?.bookingTermsTitle ?? DEFAULT_BOOKING_CONTENT.bookingTermsTitle).trim() || DEFAULT_BOOKING_CONTENT.bookingTermsTitle,
    bookingTermsIntro: String(raw?.bookingTermsIntro ?? DEFAULT_BOOKING_CONTENT.bookingTermsIntro).trim() || DEFAULT_BOOKING_CONTENT.bookingTermsIntro,
    bookingTerms: sanitizeTerms(raw?.bookingTerms),
    bookingFaqTitle: String(raw?.bookingFaqTitle ?? DEFAULT_BOOKING_CONTENT.bookingFaqTitle).trim() || DEFAULT_BOOKING_CONTENT.bookingFaqTitle,
    bookingFaq: sanitizeFaq(raw?.bookingFaq),
    itemTermsTitle: String(raw?.itemTermsTitle ?? DEFAULT_BOOKING_CONTENT.itemTermsTitle).trim() || DEFAULT_BOOKING_CONTENT.itemTermsTitle,
    itemTermsIntro: String(raw?.itemTermsIntro ?? DEFAULT_BOOKING_CONTENT.itemTermsIntro).trim() || DEFAULT_BOOKING_CONTENT.itemTermsIntro,
    itemTerms: sanitizeItemTerms(raw?.itemTerms),
  };
}

function withDefaults(payload: BookingContentPayload): BookingContentPayload {
  return {
    ...payload,
    bookingTerms: payload.bookingTerms.length > 0 ? payload.bookingTerms : DEFAULT_BOOKING_CONTENT.bookingTerms,
    bookingFaq: payload.bookingFaq.length > 0 ? payload.bookingFaq : DEFAULT_BOOKING_CONTENT.bookingFaq,
    itemTerms: payload.itemTerms.length > 0 ? payload.itemTerms : DEFAULT_BOOKING_CONTENT.itemTerms,
  };
}

export async function getBookingContent(): Promise<BookingContentPayload> {
  if (!isSanityEnabled() || !sanityClient) {
    return DEFAULT_BOOKING_CONTENT;
  }

  try {
    const raw = await sanityClient.fetch<Partial<BookingContentPayload> | null>(BOOKING_CONTENT_QUERY, {
      id: BOOKING_CONTENT_ID,
    });

    return withDefaults(normalizePayload(raw));
  } catch (error) {
    console.error("Error fetching booking content from Sanity:", error);
    return DEFAULT_BOOKING_CONTENT;
  }
}

export async function saveBookingContent(
  payload: BookingContentPayload,
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSanityWriteEnabled()) {
    return { success: false, error: "Sanity write is not configured." };
  }

  const client = getSanityWriteClient();
  if (!client) {
    return { success: false, error: "Sanity client unavailable." };
  }

  const sanitized = withDefaults(normalizePayload(payload));

  try {
    await client.createOrReplace({
      _id: BOOKING_CONTENT_ID,
      _type: "bookingContent",
      ...sanitized,
      updatedAt: new Date().toISOString(),
      ...(updatedBy ? { updatedBy } : {}),
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving booking content to Sanity:", error);
    return { success: false, error: "Failed to save booking content to Sanity." };
  }
}
