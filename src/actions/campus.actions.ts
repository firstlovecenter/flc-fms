"use server";

import { z } from "zod";

const CampusSchema = z.object({
  name: z.string().min(2),
  subdomain: z.string().min(2).max(30),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  domain: z.string().optional(),
});

export async function createCampus(input: z.infer<typeof CampusSchema>) {
  const parsed = CampusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid campus data." };
  }

  return {
    error:
      "Campus management is not enabled in this single-campus schema. Remove the campus form or re-introduce a Campus model.",
  };
}
