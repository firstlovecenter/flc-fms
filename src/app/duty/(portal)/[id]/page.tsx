import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth/guards";
import { getDutyLogById } from "@/lib/duty/queries";
import { serializeDutyLog } from "@/components/duty/types";
import DutyLogPanel from "@/components/duty/DutyLogPanel";

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const log = await getDutyLogById(params.id);
  return { title: log ? log.template.name : "Duty Log" };
}

export default async function DutyDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const session = await requirePerm("duty:view");
  const log = await getDutyLogById(params.id);
  if (!log) notFound();

  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["duty:manage"] ?? false);

  if (!canManage && log.assignedToId !== session.sub) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/duty" className="text-sm text-[var(--gold)] hover:underline">
          ← {canManage ? "Duty logs" : "My duties"}
        </Link>
        {canManage && log.status !== "SIGNED_OFF" && (
          <Link
            href={`/duty/${log.id}/edit`}
            className="text-sm text-[var(--muted)] hover:text-[var(--navy)]"
          >
            Edit assignment
          </Link>
        )}
      </div>

      <DutyLogPanel
        log={serializeDutyLog(log)}
        currentUserId={session.sub}
        canManage={canManage}
      />
    </div>
  );
}
