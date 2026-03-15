import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, statusBadgeClass } from "@/lib/utils";
import MaintenanceStatusUpdate from "@/components/maintenance/MaintenanceStatusUpdate";

const PRIORITY_COLORS: Record<string, string> = {
  LOW:      "bg-gray-100 text-[var(--slate)]",
  MEDIUM:   "bg-yellow-100 text-yellow-800",
  HIGH:     "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default async function MaintenanceDetailPage({ params }: { params: { id: string } }) {
  const session  = await requireStaff("FACILITY_MANAGER", "VICAR");

  const req = await prisma.maintenanceRequest.findFirst({
    where: { id: params.id },
    include: {
      facility:   { select: { name: true, id: true } },
      requestedBy: { select: { name: true, email: true } },
      assignedTo: { select: { name: true, email: true } },
    },
  });

  if (!req) notFound();

  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const isOpen    = ["OPEN", "IN_PROGRESS"].includes(req.status);

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Back + title */}
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
        <Link href="/maintenance" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{req.title}</h1>
            <span className={statusBadgeClass(req.status)}>{req.status.replace("_", " ")}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[req.priority]}`}>
              {req.priority}
            </span>
          </div>
          <p className="text-sm text-[var(--muted)] mt-0.5">#{req.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* Description */}
      {req.description && (
        <div className="card p-5">
          <p className="text-sm font-medium text-[var(--muted)] mb-2">Description</p>
          <p className="text-gray-800 whitespace-pre-wrap">{req.description}</p>
        </div>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <Building2 size={13} /> Facility
          </div>
          <Link href={`/facilities/${req.facilityId}`} className="text-sm font-semibold text-[var(--navy)] hover:underline">
            {req.facility?.name ?? "N/A"}
          </Link>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <User size={13} /> Reported By
          </div>
          <p className="text-sm font-semibold text-gray-800">{req.requestedBy.name}</p>
          <p className="text-xs text-[var(--muted)]">{req.requestedBy.email}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <Clock size={13} /> Reported
          </div>
          <p className="text-sm font-semibold text-gray-800">{formatDateTime(req.createdAt)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <DollarSign size={13} /> Est. Cost
          </div>
          <p className="text-sm font-semibold text-gray-800">
            {req.estimatedCost ? formatCurrency(Number(req.estimatedCost)) : "Not set"}
          </p>
          {req.actualCost && (
            <p className="text-xs text-[var(--muted)]">Actual: {formatCurrency(Number(req.actualCost))}</p>
          )}
        </div>
      </div>

      {/* Assigned to */}
      {req.assignedTo && (
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
            {req.assignedTo.name.charAt(0)}
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Assigned to</p>
            <p className="text-sm font-semibold text-gray-800">{req.assignedTo.name}</p>
          </div>
        </div>
      )}

      {/* Resolution timeline */}
      {(req.resolvedAt || req.closedAt) && (
        <div className="card p-5 border-l-4 border-green-400">
          <p className="text-sm font-medium text-[var(--muted)] mb-2">Timeline</p>
          {req.resolvedAt && (
            <p className="text-sm text-[var(--slate)]">✓ Resolved: {formatDateTime(req.resolvedAt)}</p>
          )}
          {req.closedAt && (
            <p className="text-sm text-[var(--slate)] mt-1">✓ Closed: {formatDateTime(req.closedAt)}</p>
          )}
        </div>
      )}

      {/* Maintenance lock warning */}
      {isOpen && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start sm:items-center gap-3">
          <AlertTriangle size={18} className="text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Facility is locked for maintenance</p>
            <p className="text-xs text-orange-600">
              {req.facility?.name ?? "Facility"} is marked as under maintenance until this request is resolved or closed.
            </p>
          </div>
        </div>
      )}

      {/* Status update form */}
      {canManage && isOpen && (
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Update Status</h2>
          <MaintenanceStatusUpdate requestId={req.id} currentStatus={req.status} />
        </div>
      )}
    </div>
  );
}
