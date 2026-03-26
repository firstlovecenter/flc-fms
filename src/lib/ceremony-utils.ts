import { z } from "zod";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WeddingDetails {
  type: "wedding";
  brideName: string;
  groomName: string;
  contactWhatsApp: string;
  email: string;
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
  pastorName: string;
  pastorPhone: string;
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
  pastorName: z.string().min(2, "Pastor's name is required"),
  pastorPhone: z.string().min(9, "Pastor's contact is required"),
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

export function generateCeremonyCode(): string {
  // 8-char alphanumeric, uppercase — no ambiguous chars (0, O, I, 1)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
