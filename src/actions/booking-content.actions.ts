"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/auth/guards";
import { saveBookingContent } from "@/lib/sanity/booking-content";

const TermSchema = z.object({
  title: z.string().min(1, "Term title is required"),
  body: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

const FaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

const BookingContentSchema = z.object({
  bookingTermsTitle: z.string().min(1),
  bookingTermsIntro: z.string().min(1),
  bookingTerms: z.array(TermSchema).min(1, "At least one booking term is required"),
  bookingFaqTitle: z.string().min(1),
  bookingFaq: z.array(FaqSchema).min(1, "At least one FAQ item is required"),
  itemTermsTitle: z.string().min(1),
  itemTermsIntro: z.string().min(1),
  itemTerms: z.array(z.string().min(1)).min(1, "At least one item term is required"),
});

export async function updateBookingContent(input: unknown) {
  const session = await requirePerm("bookings:manage_content");

  const parsed = BookingContentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const payload = {
    ...parsed.data,
    bookingTerms: parsed.data.bookingTerms.map((term) => ({
      title: term.title.trim(),
      body: (term.body ?? "").trim(),
      bullets: (term.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean),
    })),
    bookingFaq: parsed.data.bookingFaq.map((faq) => ({
      question: faq.question.trim(),
      answer: faq.answer.trim(),
    })),
    itemTerms: parsed.data.itemTerms.map((term) => term.trim()).filter(Boolean),
  };

  const result = await saveBookingContent(payload, session.sub);
  if (!result.success) {
    return { error: result.error ?? "Failed to save booking content." };
  }

  revalidatePath("/bookings/content");
  revalidatePath("/faq");
  revalidatePath("/guest/book");
  revalidatePath("/patron/book");
  revalidatePath("/bookings/new");
  revalidatePath("/catalog");

  return { success: true };
}
