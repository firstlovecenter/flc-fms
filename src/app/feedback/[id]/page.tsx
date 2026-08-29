import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Clock, Mail, Phone } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import FeedbackStatusUpdate from "@/components/feedback/FeedbackStatusUpdate";
import FeedbackAdminNotes from "@/components/feedback/FeedbackAdminNotes";
import StaffLayout from "@/components/layout/StaffLayout";
import { Card } from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  COMPLAINT: "Complaint",
  FEEDBACK: "Feedback",
  SUGGESTION: "Suggestion",
};

export default async function FeedbackDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePerm("feedback:view");

  const item = await prisma.facilityFeedback.findUnique({
    where: { id: params.id },
    include: {
      facility: { select: { name: true, id: true } },
      resolvedBy: { select: { name: true } },
    },
  });

  if (!item) notFound();

  const canManage =
    session.role === "SUPER_ADMIN" ||
    (session.authContext?.permissions["feedback:manage"] ?? false);
  const isOpen = ["OPEN", "IN_REVIEW"].includes(item.status);

  return (
    <StaffLayout>
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-start sm:items-center gap-3 flex-wrap">
          <Link
            href="/feedback"
            className="p-2 rounded-lg hover:bg-[var(--cream-dark)] text-[var(--muted)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title">{item.subject}</h1>
              <StatusBadge status={item.type} size="sm" label={TYPE_LABELS[item.type] ?? item.type} />
              <StatusBadge status={item.status} size="sm" />
            </div>
            <p className="text-sm text-[var(--muted)] mt-0.5">#{item.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        <Card className="p-5">
          <p className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase tracking-wide text-xs">
            Message
          </p>
          <p className="text-sm text-[var(--slate)] whitespace-pre-wrap leading-relaxed">{item.message}</p>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-medium mb-1.5">
              <Building2 size={12} /> Facility
            </div>
            {item.facility ? (
              <Link
                href={`/facilities/${item.facilityId}`}
                className="text-sm font-semibold text-[var(--navy)] hover:underline"
              >
                {item.facility.name}
              </Link>
            ) : (
              <p className="text-sm font-medium text-[var(--muted)]">Not specified</p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-medium mb-1.5">
              <User size={12} /> Submitter
            </div>
            {item.isAnonymous ? (
              <p className="text-sm font-semibold text-[var(--navy)]">Anonymous</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--navy)]">{item.submitterName ?? "—"}</p>
                {item.submitterEmail && (
                  <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-1">
                    <Mail size={10} /> {item.submitterEmail}
                  </p>
                )}
                {item.submitterPhone && (
                  <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
                    <Phone size={10} /> {item.submitterPhone}
                  </p>
                )}
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-medium mb-1.5">
              <Clock size={12} /> Submitted
            </div>
            <p className="text-sm font-semibold text-[var(--navy)]">{formatDateTime(item.createdAt)}</p>
            {item.resolvedAt && (
              <p className="text-xs text-[var(--muted)] mt-1">
                Resolved: {formatDateTime(item.resolvedAt)}
                {item.resolvedBy ? ` by ${item.resolvedBy.name}` : ""}
              </p>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Internal Notes</h2>
          <FeedbackAdminNotes
            feedbackId={item.id}
            initialNotes={item.adminNotes}
            canManage={canManage}
          />
        </Card>

        {canManage && isOpen && (
          <Card className="p-6">
            <h2 className="font-semibold text-[var(--navy)] mb-4">Update Status</h2>
            <FeedbackStatusUpdate feedbackId={item.id} currentStatus={item.status} />
          </Card>
        )}
      </div>
    </StaffLayout>
  );
}
