import type { DutyTemplateType, DutyTimeType } from "@prisma/client";

export type TemplateItemInput = {
  description: string;
  timeType: DutyTimeType;
  scheduledTime: string | null;
};

/** Normalize client payload before Zod / Prisma (empty times → null). */
export function normalizeTemplateItemsForSave(
  templateType: DutyTemplateType,
  items: TemplateItemInput[],
): TemplateItemInput[] {
  return items.map((item) => {
    const description = item.description.trim();
    if (templateType === "CHECKLIST") {
      return {
        description,
        timeType: "SPECIFIC" as const,
        scheduledTime: null,
      };
    }
    const timeType = item.timeType;
    const scheduledTime =
      timeType === "SPECIFIC" && item.scheduledTime?.trim()
        ? item.scheduledTime.trim()
        : null;
    return { description, timeType, scheduledTime };
  });
}

export type TemplateFormItemRow = {
  description: string;
  timeType: DutyTimeType;
  scheduledTime: string;
};

export function mapTemplateItemsToFormRows(
  templateType: DutyTemplateType,
  items: {
    description: string;
    timeType: DutyTimeType;
    scheduledTime: string | null;
  }[],
): TemplateFormItemRow[] {
  return items.map((item) => ({
    description: item.description,
    timeType: templateType === "CHECKLIST" ? "SPECIFIC" : item.timeType,
    scheduledTime: item.scheduledTime ?? "",
  }));
}
