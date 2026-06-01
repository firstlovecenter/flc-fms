"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addWeeks, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDutyDate } from "@/lib/duty/format";
import DutyDayView from "./DutyDayView";
import DutyWeekView from "./DutyWeekView";
import type { SerializedDutyLog } from "./types";

const REFRESH_MS = 30_000;

export type DutyDisplayView = "daily" | "weekly";

type DutyBoardDisplayProps = {
  view: DutyDisplayView;
  logs: SerializedDutyLog[];
  anchorDateIso: string;
  weekStartIso: string;
  weekEndIso: string;
};

function buildDisplayUrl(
  view: DutyDisplayView,
  dateStr: string,
): string {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("date", dateStr);
  return `/duty/display?${params.toString()}`;
}

export default function DutyBoardDisplay({
  view,
  logs,
  anchorDateIso,
  weekStartIso,
  weekEndIso,
}: DutyBoardDisplayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const anchorDate = new Date(anchorDateIso);
  const dateStr = format(anchorDate, "yyyy-MM-dd");

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  function shiftPeriod(delta: number) {
    const next =
      view === "weekly"
        ? format(addWeeks(anchorDate, delta), "yyyy-MM-dd")
        : format(
            new Date(anchorDate.getTime() + delta * 86400000),
            "yyyy-MM-dd",
          );
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", next);
    router.push(`/duty/display?${params.toString()}`);
  }

  const weekStartLabel = format(new Date(weekStartIso), "d MMM");
  const weekEndLabel = format(new Date(weekEndIso), "d MMM yyyy");

  return (
    <div className="min-h-screen bg-[var(--duty-board-bg)] text-[var(--duty-board-fg)]">
      <header className="px-4 md:px-6 py-4 border-b border-[var(--border)] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[var(--gold)] text-sm font-semibold uppercase tracking-widest">
              First Love Center · Duty Board
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[var(--duty-board-fg)]">
              {view === "daily"
                ? formatDutyDate(anchorDate)
                : `Week of ${weekStartLabel} – ${weekEndLabel}`}
            </h1>
          </div>
          <p className="text-[var(--muted)] text-sm shrink-0">
            Auto-refreshes every 30s
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--cream-dark)]">
            <Link
              href={buildDisplayUrl("daily", dateStr)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "daily"
                  ? "bg-[var(--gold)] text-[var(--duty-gold-on-accent)]"
                  : "text-[var(--muted)] hover:text-[var(--duty-board-fg)]"
              }`}
            >
              Daily
            </Link>
            <Link
              href={buildDisplayUrl("weekly", dateStr)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "weekly"
                  ? "bg-[var(--gold)] text-[var(--duty-gold-on-accent)]"
                  : "text-[var(--muted)] hover:text-[var(--duty-board-fg)]"
              }`}
            >
              Weekly
            </Link>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => shiftPeriod(-1)}
              className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--cream-dark)] text-[var(--duty-board-fg)]"
              aria-label={view === "weekly" ? "Previous week" : "Previous day"}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("date", format(new Date(), "yyyy-MM-dd"));
                router.push(`/duty/display?${params.toString()}`);
              }}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--cream-dark)] text-[var(--duty-board-fg)]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftPeriod(1)}
              className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--cream-dark)] text-[var(--duty-board-fg)]"
              aria-label={view === "weekly" ? "Next week" : "Next day"}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6">
        {view === "daily" ? (
          <DutyDayView logs={logs} />
        ) : (
          <DutyWeekView logs={logs} weekStartIso={weekStartIso} />
        )}
      </main>
    </div>
  );
}
