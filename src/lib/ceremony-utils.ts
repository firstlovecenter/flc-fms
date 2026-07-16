import { z } from "zod";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WeddingDetails {
  type: "wedding";
  brideName: string;
  groomName: string;
  contactWhatsApp: string;
  email: string;
  bishopName: string;
  bishopPhone: string;
}

export interface NamingDetails {
  type: "naming";
  fatherName: string;
  fatherPhone: string;
  fatherWhatsApp: string;
  childrenNames: string;
  childBirthday: string; // DD/MM/YYYY
  motherName: string;
  motherPhone: string;
  email: string;
  /** Legacy fields retained so older bookings can still be displayed. */
  pastorName?: string;
  pastorPhone?: string;
  bishopName: string;
  bishopPhone: string;
}

export type CeremonyDetails = WeddingDetails | NamingDetails;

// ── Zod Schemas ────────────────────────────────────────────────────────────────

export const WeddingDetailsSchema = z.object({
  type: z.literal("wedding"),
  brideName: z.string().min(2, "Bride's name is required"),
  groomName: z.string().min(2, "Groom's name is required"),
  contactWhatsApp: z.string().min(9, "Contact number is required"),
  email: z.string().email("A valid email is required"),
  bishopName: z.string().min(2, "Bishop's name is required"),
  bishopPhone: z.string().min(9, "Bishop's contact is required"),
});

export const NamingDetailsSchema = z.object({
  type: z.literal("naming"),
  fatherName: z.string().min(2, "Father's name is required"),
  fatherPhone: z.string().min(9, "Father's contact is required"),
  fatherWhatsApp: z.string().min(9, "Father's WhatsApp is required"),
  childrenNames: z.string().min(1, "Child's name is required"),
  childBirthday: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date must be DD/MM/YYYY"),
  motherName: z.string().min(2, "Mother's name is required"),
  motherPhone: z.string().min(9, "Mother's contact is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  pastorName: z.string().optional(),
  pastorPhone: z.string().optional(),
  bishopName: z.string().min(2, "Bishop's name is required"),
  bishopPhone: z.string().min(9, "Bishop's contact is required"),
});

export const CeremonyDetailsSchema = z.discriminatedUnion("type", [
  WeddingDetailsSchema,
  NamingDetailsSchema,
]);

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getCeremonyType(
  slug: string
): "wedding" | "naming" | null {
  const upper = (slug ?? "").toUpperCase();
  if (upper.includes("WEDDING")) return "wedding";
  if (upper.includes("NAMING") || upper.includes("OUTDOORING")) return "naming";
  return null;
}

// ── Ceremony Date Helpers ──────────────────────────────────────────────────────

/** Returns the first Saturday of each month for the next N months. */
export function getFirstSaturdaysForMonths(monthsAhead: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const dow = d.getDay(); // 0=Sun … 6=Sat
    d.setDate(1 + (dow === 6 ? 0 : 6 - dow));
    dates.push(d);
  }
  return dates;
}

/** Formats a Date as YYYY-MM-DD using local time (no timezone shift). */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Ceremony Category / Day Gating ────────────────────────────────────────────

/** The two ceremony booking categories, as stored on Booking.category (uppercase). */
export const CEREMONY_CATEGORIES = ["WEDDING", "NAMING"] as const;

/** True if `category` (case-insensitive) is a ceremony category (WEDDING/NAMING). */
export function isCeremonyCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return (CEREMONY_CATEGORIES as readonly string[]).includes(category.toUpperCase());
}

/**
 * True if `date` is a designated ceremony day: the first Saturday of its month
 * (unless staff excluded it via an EXCLUDE override), or a staff-added ADD
 * override. Accepts either the global prisma client or a transaction client
 * so it can be called both inside and outside a transaction.
 */
export async function isCeremonyDay(
  db: {
    ceremonyDateOverride: {
      findMany: (args: { select: { date: true; type: true } }) => Promise<{ date: Date; type: "ADD" | "EXCLUDE" }[]>;
    };
  },
  date: Date,
): Promise<boolean> {
  const dateStr = toDateStr(date);
  const overrides = await db.ceremonyDateOverride.findMany({ select: { date: true, type: true } });
  const override = overrides.find((o) => toDateStr(o.date) === dateStr);
  if (override) return override.type === "ADD";
  const firstSats = getFirstSaturdaysForMonths(13).map(toDateStr);
  return firstSats.includes(dateStr);
}

export function generateCeremonyCode(): string {
  // 8-char alphanumeric, uppercase — no ambiguous chars (0, O, I, 1)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
