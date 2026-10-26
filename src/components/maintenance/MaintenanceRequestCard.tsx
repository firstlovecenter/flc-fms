"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import MaintenanceStatusUpdate from "@/components/maintenance/MaintenanceStatusUpdate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn, formatCurrency } from "@/lib/utils";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);

const TD = "px-4 py-3 align-middle";

interface MaintenanceRequestCardProps {
  request: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: Date;
    estimatedCost: number | null;
    actualCost: number | null;
    facility: { name: string } | null;
    requestedBy: { name: string };
    assignedTo: { name: string } | null;
  };
  canManage: boolean;
}

/** One maintenance request as a table row (a compact card on phones). */
export default function MaintenanceRequestCard({ request: r, canManage }: MaintenanceRequestCardProps) {
  const isDone = ["RESOLVED", "CLOSED"].includes(r.status);
  const cost = r.actualCost ?? r.estimatedCost;

  return (
    <tr className="border-t border-border/60 transition-colors hover:bg-muted/40">
      <td className={cn(TD, "min-w-[15rem]")}>
        <Link href={`/maintenance/${r.id}`} className="font-medium text-[var(--navy)] hover:underline">{r.title}</Link>
        {r.description && <span className="mt-0.5 line-clamp-1 block text-xs text-[var(--muted)]">{r.description}</span>}
      </td>
      <td className={cn(TD, "text-[var(--slate)]")}>{r.facility?.name ?? "—"}</td>
      <td className={cn(TD, "sm:max-lg:hidden")}><StatusBadge status={r.priority} size="xs" /></td>
      <td className={cn(TD, "text-[var(--slate)]")}>
        <span className="block whitespace-nowrap">{formatDate(r.createdAt)}</span>
        <span className="block text-xs text-[var(--muted)]">
          {r.assignedTo ? `Assigned to ${r.assignedTo.name}` : `By ${r.requestedBy.name}`}
        </span>
      </td>
      <td className={cn(TD, "whitespace-nowrap text-right tabular-nums text-[var(--slate)] sm:max-lg:hidden")}>
        {cost != null ? (
          <>
            {formatCurrency(cost)}
            <span className="block text-xs text-[var(--muted)]">{r.actualCost != null ? "Actual" : "Estimate"}</span>
          </>
        ) : "—"}
      </td>
      <td className={TD}><StatusBadge status={r.status} size="xs" /></td>
      <td className={TD}>
        <div className="flex items-center justify-end gap-2">
          {canManage && !isDone && <MaintenanceStatusUpdate requestId={r.id} currentStatus={r.status} />}
          <Link
            href={`/maintenance/${r.id}`}
            aria-label={`Open ${r.title}`}
            className="flex size-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </td>
    </tr>
  );
}
