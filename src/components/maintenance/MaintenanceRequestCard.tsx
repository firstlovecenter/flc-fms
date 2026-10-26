"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import MaintenanceStatusUpdate from "@/components/maintenance/MaintenanceStatusUpdate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);

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

/** One maintenance request as a compact list row; the title opens the request. */
export default function MaintenanceRequestCard({ request: r, canManage }: MaintenanceRequestCardProps) {
  const isDone = ["RESOLVED", "CLOSED"].includes(r.status);
  const facts = [
    r.facility?.name,
    r.assignedTo ? `Assigned to ${r.assignedTo.name}` : `Raised by ${r.requestedBy.name}`,
    formatDate(r.createdAt),
    r.actualCost ? `Cost ${formatCurrency(r.actualCost)}` : r.estimatedCost ? `Est. ${formatCurrency(r.estimatedCost)}` : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
      <Link href={`/maintenance/${r.id}`} className="group min-w-0 flex-1 no-underline">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-[var(--navy)] group-hover:underline">{r.title}</span>
          <StatusBadge status={r.status} size="xs" />
          {r.priority !== "LOW" && r.priority !== "MEDIUM" && <StatusBadge status={r.priority} size="xs" />}
        </span>
        {r.description && <span className="mt-1 line-clamp-1 block text-xs text-[var(--slate)]">{r.description}</span>}
        <span className="mt-1 block text-xs text-[var(--muted)]">{facts.join(" · ")}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {canManage && !isDone && <MaintenanceStatusUpdate requestId={r.id} currentStatus={r.status} />}
        <Link
          href={`/maintenance/${r.id}`}
          aria-label={`Open ${r.title}`}
          className="ml-auto hidden size-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)] sm:flex"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
    </li>
  );
}
