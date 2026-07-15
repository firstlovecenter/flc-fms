import { Suspense } from "react";
import { endOfWeek, startOfWeek } from "date-fns";
import { dutyDateFromInput, toDutyDateOnly } from "@/lib/duty/dates";
import {
  getDutyLogsForDate,
  getDutyLogsForWeek,
  WEEK_STARTS_ON,
} from "@/lib/duty/queries";
import { serializeDutyLog } from "@/components/duty/types";
import DutyBoardDisplay, {
  type DutyDisplayView,
} from "@/components/duty/DutyBoardDisplay";

export const metadata = {
  title: "Duty Board — Office Display",
  description: "Live duty logs for the office screen",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DutyDisplayPage(
  props: {
    searchParams: Promise<{ date?: string; view?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const view: DutyDisplayView =
    searchParams.view === "weekly" ? "weekly" : "daily";

  const dateParam = searchParams.date;
  const anchorDate = dateParam
    ? dutyDateFromInput(dateParam)
    : toDutyDateOnly(new Date());

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });

  const logs =
    view === "weekly"
      ? await getDutyLogsForWeek(anchorDate)
      : await getDutyLogsForDate(anchorDate);

  const serialized = logs.map(serializeDutyLog);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--duty-board-bg)] flex items-center justify-center text-[var(--muted)]">
          Loading duty board…
        </div>
      }
    >
      <DutyBoardDisplay
        view={view}
        logs={serialized}
        anchorDateIso={anchorDate.toISOString()}
        weekStartIso={weekStart.toISOString()}
        weekEndIso={weekEnd.toISOString()}
      />
    </Suspense>
  );
}
