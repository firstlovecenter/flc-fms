import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_VICAR_PERMISSIONS, PERMISSION_LABELS, type VicarPermissions } from "@/lib/staff-permissions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import PermissionsEditor from "@/components/staff/PermissionsEditor";

export default async function VicarPermissionsPage({ params }: { params: { id: string } }) {
  await requireStaff("FACILITY_MANAGER");

  const vicar = await prisma.user.findFirst({
    where: { id: params.id, role: "VICAR" },
    select: { id: true, name: true, email: true, permissions: true, lastLoginAt: true },
  });

  if (!vicar) notFound();

  const currentPermissions: VicarPermissions = {
    ...DEFAULT_VICAR_PERMISSIONS,
    ...(vicar.permissions as Partial<VicarPermissions>),
  };

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
          <h1 className="page-title">Vicar Permissions</h1>
          <p className="text-sm page-subtitle">{vicar.name} · {vicar.email}</p>
        </div>
      </div>

      <div className="bg-info/10 border border-info/25 rounded-xl p-4 text-sm text-info">
        <strong>About Vicar Permissions:</strong> Vicars operate within the campus but have limited access.
        Toggle each permission individually. Changes take effect immediately on the vicar&apos;s next action.
      </div>

      <PermissionsEditor
        vicarId={vicar.id}
        vicarName={vicar.name}
        currentPermissions={currentPermissions}
        labels={PERMISSION_LABELS}
      />
    </div>
  );
}
