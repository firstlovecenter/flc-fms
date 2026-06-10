import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Clock, DollarSign, AlertTriangle, Receipt } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import MaintenanceStatusUpdate from "@/components/maintenance/MaintenanceStatusUpdate";
import { Card } from "@/components/ui/card";

export default async function MaintenanceDetailPage({ params }: { params: { id: string } }) {
  const session  = await requireStaff("FACILITY_MANAGER", "VICAR");

  const req = await prisma.maintenanceRequest.findFirst({
    where: { id: params.id },
    include: {
      facility:    { select: { name: true, id: true } },
      requestedBy: { select: { name: true, email: true } },
      assignedTo:  { select: { name: true, email: true } },
      expense:     { select: { id: true, status: true, amount: true, title: true } },
    },
  });

  if (!req) notFound();

  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const isOpen    = ["OPEN", "IN_PROGRESS"].includes(req.status);

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Back + title */}
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
        <Link href="/maintenance" className="p-2 rounded-lg hover:bg-[var(--cream-dark)] text-[var(--muted)] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{req.title}</h1>
            <StatusBadge status={req.status} size="sm" />
            <StatusBadge status={req.priority} size="sm" />
          </div>
          <p className="text-sm text-[var(--muted)] mt-0.5">#{req.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* Description */}
      {req.description && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase tracking-wide text-xs">Description</p>
          <p className="text-sm text-[var(--slate)] whitespace-pre-wrap leading-relaxed">{req.description}</p>
        </Card>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-medium mb-1.5">
            <Building2 size={12} /> Facility
          </div>
          {req.facility ? (
            <Link href={`/facilities/${req.facilityId}`} className="text-sm font-semibold text-[var(--navy)] hover:underline">
              {req.facility.name}
            </Link>
          ) : (
            <p className="text-sm font-medium text-[var(--muted)]">General / No facility</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-medium mb-1.5">
            <User size={12} /> Reported By
          </div>
          <p className="text-sm font-semibold text-[var(--navy)]">{req.requestedBy.name}</p>
          <p className="text-xs text-[var(--muted)]">{req.requestedBy.email}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-medium mb-1.5">
            <Clock size={12} /> Reported
          </div>
          <p className="text-sm font-semibold text-[var(--navy)]">{formatDateTime(req.createdAt)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-medium mb-1.5">
            <DollarSign size={12} /> Cost
          </div>
          <p className="text-sm font-semibold text-[var(--navy)]">
            {req.estimatedCost ? formatCurrency(Number(req.estimatedCost)) : "—"}
          </p>
          {req.actualCost && (
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Actual: {formatCurrency(Number(req.actualCost))}
            </p>
          )}
        </Card>
      </div>

      {/* Assigned to */}
      {req.assignedTo && (
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-info/10 text-info flex items-center justify-center text-sm font-bold flex-shrink-0">
            {req.assignedTo.name.charAt(0)}
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Assigned to</p>
            <p className="text-sm font-semibold text-[var(--navy)]">{req.assignedTo.name}</p>
            {req.assignedTo.email && (
              <p className="text-xs text-[var(--muted)]">{req.assignedTo.email}</p>
            )}
          </div>
        </Card>
      )}

      {/* Linked expense */}
      {req.expense ? (
        <Card className="p-5 border-l-4 border-l-[var(--gold)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[rgba(200,163,90,0.12)] border border-[rgba(200,163,90,0.2)] flex items-center justify-center flex-shrink-0">
                <Receipt size={16} className="text-[var(--gold)]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-0.5">Expense Request</p>
                <p className="text-sm font-semibold text-[var(--navy)]">{req.expense.title}</p>
                <p className="text-sm font-bold text-[var(--gold)]">{formatCurrency(Number(req.expense.amount))}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={req.expense.status} size="sm" />
              <Link
                href={`/transactions/${req.expense.id}`}
                className="text-sm font-semibold text-[var(--navy)] hover:text-[var(--gold)] transition-colors underline underline-offset-2"
              >
                View →
              </Link>
            </div>
          </div>
          {req.expense.status === "PENDING" && (
            <p className="text-xs text-[var(--muted)] mt-3">
              This expense is pending approval. Go to{" "}
              <Link href="/transactions?tab=expenses&status=PENDING" className="text-[var(--gold)] hover:underline font-medium">
                Transactions → Expenses
              </Link>{" "}
              to approve or reject it.
            </p>
          )}
        </Card>
      ) : (req.estimatedCost || req.actualCost) ? (
        <Card className="p-4 border border-dashed border-[var(--border)] bg-[var(--cream)]">
          <p className="text-sm text-[var(--muted)]">
            No expense request linked yet. Set an actual cost below to generate one automatically.
          </p>
        </Card>
      ) : null}

      {/* Resolution timeline */}
      {(req.resolvedAt || req.closedAt) && (
        <Card className="p-5 border-l-4 border-l-success">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">Timeline</p>
          {req.resolvedAt && (
            <p className="text-sm text-[var(--slate)]">✓ Resolved: {formatDateTime(req.resolvedAt)}</p>
          )}
          {req.closedAt && (
            <p className="text-sm text-[var(--slate)] mt-1">✓ Closed: {formatDateTime(req.closedAt)}</p>
          )}
        </Card>
      )}

      {/* Maintenance lock warning */}
      {isOpen && req.facility && (
        <div className="bg-maintenance/10 border border-maintenance/25 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-maintenance flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-maintenance">Facility locked for maintenance</p>
            <p className="text-xs text-maintenance/80 mt-0.5">
              {req.facility.name} is marked as under maintenance until this request is resolved or closed.
            </p>
          </div>
        </div>
      )}

      {/* Status update form */}
      {canManage && isOpen && (
        <Card className="p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Update Status</h2>
          <MaintenanceStatusUpdate requestId={req.id} currentStatus={req.status} />
        </Card>
      )}
    </div>
  );
}
