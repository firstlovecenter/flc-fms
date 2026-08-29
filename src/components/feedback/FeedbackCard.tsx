"use client";

import Link from "next/link";
import { MapPin, User, Calendar } from "lucide-react";
import FeedbackStatusUpdate from "@/components/feedback/FeedbackStatusUpdate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);

const TYPE_LABELS: Record<string, string> = {
  COMPLAINT: "Complaint",
  FEEDBACK: "Feedback",
  SUGGESTION: "Suggestion",
};

interface FeedbackCardProps {
  item: {
    id: string;
    type: string;
    subject: string;
    message: string;
    status: string;
    isAnonymous: boolean;
    submitterName: string | null;
    createdAt: Date;
    facility: { name: string } | null;
  };
  canManage: boolean;
  index: number;
}

export default function FeedbackCard({ item, canManage, index: idx }: FeedbackCardProps) {
  const isDone = ["RESOLVED", "CLOSED"].includes(item.status);
  const submitterLabel = item.isAnonymous
    ? "Anonymous"
    : item.submitterName ?? "Unknown";

  return (
    <Card
      style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s backwards` }}
      className="p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] text-[1rem]">
              {item.subject}
            </h3>
            <StatusBadge status={item.type} size="md" label={TYPE_LABELS[item.type] ?? item.type} />
            <StatusBadge status={item.status} size="md" />
          </div>
          <p className="text-[0.9rem] text-[var(--slate)] mb-3 line-clamp-2">{item.message}</p>
          <div className="flex items-center gap-4 flex-wrap text-[0.8rem] text-[var(--text-muted)]">
            {item.facility && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} /> {item.facility.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <User size={12} /> {submitterLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} /> {formatDate(item.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/feedback/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            View
          </Link>
          {canManage && !isDone && (
            <FeedbackStatusUpdate feedbackId={item.id} currentStatus={item.status} compact />
          )}
        </div>
      </div>
    </Card>
  );
}
