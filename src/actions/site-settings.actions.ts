"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

export interface SiteSettings {
  officePhone: string;
  officeEmail: string;
}

const DEFAULTS: SiteSettings = {
  officePhone: "",
  officeEmail: "",
};

const KEYS: (keyof SiteSettings)[] = ["officePhone", "officeEmail"];

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: KEYS } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...map } as SiteSettings;
}

export async function updateSiteSettings(data: Partial<SiteSettings>) {
  await requirePerm("settings:manage");

  for (const [key, value] of Object.entries(data)) {
    if (!KEYS.includes(key as keyof SiteSettings)) continue;
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: String(value ?? "") },
      update: { value: String(value ?? "") },
    });
  }

  revalidatePath("/");
  revalidatePath("/catalog/weddings");
  revalidatePath("/catalog/namings");
  revalidatePath("/ceremony-code-request");
  revalidatePath("/guest/book");
  return { success: true };
}
