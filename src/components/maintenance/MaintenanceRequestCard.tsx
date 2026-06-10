"use client";

import Link from "next/link";
import { MapPin, User, Wrench, Calendar } from "lucide-react";
import MaintenanceStatusUpdate from "@/components/maintenance/MaintenanceStatusUpdate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

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
    <Card style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s backwards` }} className="p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] text-[1rem]">{r.title}</h3>
            <StatusBadge status={r.priority} size="md" />
            <StatusBadge status={r.status} size="md" />
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
          <Link href={`/maintenance/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View</Link>
          {canManage && !isDone && (
            <MaintenanceStatusUpdate requestId={r.id} currentStatus={r.status} />
          )}
        </div>
      </div>
    </Card>
  );
}
