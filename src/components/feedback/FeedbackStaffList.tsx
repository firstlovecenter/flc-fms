import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import FeedbackCard from "@/components/feedback/FeedbackCard";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";

const STATUS_FILTERS = ["ALL", "OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;

export default async function FeedbackStaffList({
  searchParams,
  canManage,
}: {
  searchParams: { status?: string };
  canManage: boolean;
}) {
  const where = {
    ...(searchParams.status && searchParams.status !== "ALL"
      ? { status: searchParams.status as "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED" }
      : {}),
  };

  const [items, summary] = await Promise.all([
    prisma.facilityFeedback.findMany({
      where,
      include: { facility: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.facilityFeedback.groupBy({
      by: ["status"],
      where: {},
      _count: true,
    }),
  ]);

  const open = summary.find((s) => s.status === "OPEN")?._count ?? 0;
  const inReview = summary.find((s) => s.status === "IN_REVIEW")?._count ?? 0;
  const resolved = summary.find((s) => s.status === "RESOLVED")?._count ?? 0;
  const activeStatus = searchParams.status ?? "ALL";

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div
        className="fixed top-[100px] -right-[80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        }}
      />

      <PageHeader
        variant="hero"
        eyebrow="Public Submissions"
        title="Complaints & Feedback"
        description={`${items.length} submission${items.length !== 1 ? "s" : ""} to review`}
        className="relative z-10"
      />

      <div className="grid grid-cols-3 gap-4 relative z-10 stagger-children">
        <StatCard label="Open" value={open} color="warning" />
        <StatCard label="In Review" value={inReview} color="maintenance" />
        <StatCard label="Resolved" value={resolved} color="success" />
      </div>

      <div className="flex gap-2 flex-wrap relative z-10">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/feedback?status=${s}`}
            className={cn(
              "px-4 py-2 rounded-full text-[0.8rem] font-semibold transition-all duration-150 border",
              activeStatus === s
                ? "bg-[var(--navy)] dark:bg-[var(--navy-light)] text-white border-[rgba(200,163,90,0.3)] shadow-[0_4px_12px_rgba(10,22,40,0.15)] -translate-y-0.5"
                : "bg-white/80 dark:bg-[rgba(255,255,255,0.06)] text-[var(--slate)] dark:text-[var(--muted)] border-[rgba(200,163,90,0.15)] hover:-translate-y-px hover:border-[rgba(200,163,90,0.3)]",
            )}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-state card relative z-10">
          <p>No feedback submissions found.</p>
        </div>
      ) : (
        <div className="grid gap-3 relative z-10">
          {items.map((item, idx) => (
            <FeedbackCard key={item.id} item={item} canManage={canManage} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
