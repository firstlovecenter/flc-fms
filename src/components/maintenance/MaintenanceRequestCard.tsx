"use client";

import Link from "next/link";
import { MapPin, User, Wrench, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import MaintenanceStatusUpdate from "@/components/maintenance/MaintenanceStatusUpdate";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const PRIORITY_CLASSES: Record<string, string> = {
  HIGH:   "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  MEDIUM: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  LOW:    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

const STATUS_CLASSES: Record<string, string> = {
  OPEN:        "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  IN_PROGRESS: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  RESOLVED:    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  CLOSED:      "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

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
  index: number;
}

export default function MaintenanceRequestCard({ request: r, canManage, index: idx }: MaintenanceRequestCardProps) {
  const isDone = ["RESOLVED", "CLOSED"].includes(r.status);

  return (
    <div
      className="card p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
      style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s backwards` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] text-[1rem]">{r.title}</h3>
            <span className={cn("inline-flex items-center px-2.5 py-1 text-[0.75rem] font-semibold rounded-[var(--r-xs)] border", PRIORITY_CLASSES[r.priority] ?? PRIORITY_CLASSES.LOW)}>
              {r.priority}
            </span>
            <span className={cn("inline-flex items-center px-2.5 py-1 text-[0.75rem] font-semibold rounded-[var(--r-xs)] border", STATUS_CLASSES[r.status] ?? STATUS_CLASSES.OPEN)}>
              {r.status.replace("_", " ")}
            </span>
          </div>
          {r.description && (
            <p className="text-[0.9rem] text-[var(--slate)] mb-3">{r.description}</p>
          )}
          <div className="flex items-center gap-4 flex-wrap text-[0.8rem] text-[var(--text-muted)]">
            {r.facility && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} /> {r.facility.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <User size={12} /> {r.requestedBy.name}
            </span>
            {r.assignedTo && (
              <span className="inline-flex items-center gap-1.5">
                <Wrench size={12} /> Assigned to {r.assignedTo.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} /> {formatDate(r.createdAt)}
            </span>
            {r.estimatedCost && <span>Est. {formatCurrency(Number(r.estimatedCost))}</span>}
            {r.actualCost && <span>Actual {formatCurrency(Number(r.actualCost))}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/maintenance/${r.id}`} className="btn-secondary text-[0.8rem] py-1.5 px-3">View</Link>
          {canManage && !isDone && (
            <MaintenanceStatusUpdate requestId={r.id} currentStatus={r.status} />
          )}
        </div>
      </div>
    </div>
  );
}
