import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { resolvePermissions } from "@/lib/staff-permissions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import PermissionsEditor from "@/components/staff/PermissionsEditor";

const ROLE_LABELS: Record<string, string> = {
  FACILITY_MANAGER: "Facility Manager",
  BOOKING_MANAGER: "Booking Manager",
  VICAR: "Vicar",
  STAFF: "Staff",
};

export default async function StaffPermissionsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requirePerm("staff:manage");

  const staff = await prisma.user.findFirst({
    where: { id: params.id, role: { notIn: ["SUPER_ADMIN", "PATRON"] } },
    select: { id: true, name: true, email: true, role: true, permissions: true },
  });

  if (!staff) notFound();

  const currentPermissions = resolvePermissions(
    staff.role,
    staff.permissions as Record<string, boolean> | null
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/staff"
          aria-label="Back to staff"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-[var(--muted)]")}
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">Staff Permissions</h1>
          <p className="text-sm page-subtitle">
            {staff.name} · {staff.email} · {ROLE_LABELS[staff.role] ?? staff.role}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-info/25 bg-info/10 p-4 text-sm text-info">
        <strong>Access control:</strong> the role sets a starting point; toggle any permission to customize
        this person&apos;s access. Changes take effect immediately.
      </div>

      <PermissionsEditor
        staffId={staff.id}
        staffName={staff.name}
        currentPermissions={currentPermissions}
      />
    </div>
  );
}
