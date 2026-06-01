import type { DutyTimeType } from "@prisma/client";

/** Display label for the Time column on duty forms. */
export function formatDutyTime(
  timeType: DutyTimeType,
  scheduledTime: string | null,
): string {
  if (timeType === "END_OF_DAY") return "End of Day";
  if (timeType === "CONTINUOUS") return "Continuous";
  if (!scheduledTime) return "—";
  const [h, m] = scheduledTime.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDutyDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
