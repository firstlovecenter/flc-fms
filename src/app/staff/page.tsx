import Image from "next/image";
import { Users } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { cn, formatDate } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import AddStaffModal from "@/components/staff/AddStaffModal";
import StaffRowActions from "@/components/staff/StaffRowActions";
import { EmptyState } from "@/components/ui/empty";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  FACILITY_MANAGER: "Facility Manager",
  STAFF: "Staff",
  BOOKING_MANAGER: "Booking Manager",
  VICAR: "Vicar",
};

const ROLE_TONE: Record<string, string> = {
  SUPER_ADMIN: "bg-inventory/10 text-inventory",
  FACILITY_MANAGER: "bg-gold/10 text-gold",
};

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  lastLoginAt: Date | null;
  profilePicture: string | null;
};

export default async function StaffPage() {
  const session = await requirePerm("staff:view");
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const canManage = isSuperAdmin || (session.authContext?.permissions["staff:manage"] ?? false);

  const select = { id: true, name: true, email: true, phone: true, role: true, lastLoginAt: true, profilePicture: true } as const;
  const [activeStaff, inactiveStaff] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { notIn: ["SUPER_ADMIN", "PATRON"] } },
      select,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { isActive: false, role: { notIn: ["SUPER_ADMIN", "PATRON"] } },
      select,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const activeFms = activeStaff.filter((u) => u.role === "FACILITY_MANAGER").length;

  // Mirrors checkStaffTarget: only a Super Admin manages Facility Managers, and
  // nobody manages their own account from this list.
  const canManageMember = (m: Member) =>
    canManage && m.id !== session.sub && (isSuperAdmin || (m.role !== "FACILITY_MANAGER" && m.role !== "SUPER_ADMIN"));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Staff"
        description="Everyone who can sign in to the staff portal. Open a person's menu to edit their details, permissions or password."
        meta={`${activeStaff.length} active · ${activeFms} Facility Manager${activeFms !== 1 ? "s" : ""} · ${inactiveStaff.length} inactive`}
        actions={canManage ? <AddStaffModal canAssignSuperAdmin={isSuperAdmin} /> : undefined}
        className="mb-0"
      />

      {activeStaff.length === 0 ? (
        <EmptyState icon={<Users />} title="No staff yet" description="Staff you add appear here, with their role and last sign-in." />
      ) : (
        <StaffList members={activeStaff} currentUserRole={session.role} canManageMember={canManageMember} />
      )}

      {inactiveStaff.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Inactive · {inactiveStaff.length}
          </h2>
          <StaffList members={inactiveStaff} currentUserRole={session.role} canManageMember={canManageMember} inactive />
        </section>
      )}
    </div>
  );
}

function StaffList({
  members,
  currentUserRole,
  canManageMember,
  inactive = false,
}: {
  members: Member[];
  currentUserRole: string;
  canManageMember: (m: Member) => boolean;
  inactive?: boolean;
}) {
  return (
    <ul
      className={cn(
        "divide-y divide-border/70 rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]",
        inactive && "opacity-80"
      )}
    >
      {members.map((u) => (
        <li key={u.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Avatar name={u.name} src={u.profilePicture} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-sm font-medium text-[var(--navy)]">{u.name}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-4",
                  ROLE_TONE[u.role] ?? "bg-secondary text-secondary-foreground"
                )}
              >
                {ROLE_LABELS[u.role] ?? u.role.replace(/_/g, " ")}
              </span>
              {inactive && (
                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[0.6875rem] font-medium leading-4 text-secondary-foreground">
                  Inactive
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
              <a href={`mailto:${u.email}`} className="truncate hover:text-[var(--navy)] hover:underline">{u.email}</a>
              {u.phone && (
                <>
                  <span aria-hidden>·</span>
                  <a href={`tel:${u.phone}`} className="hover:text-[var(--navy)] hover:underline">{u.phone}</a>
                </>
              )}
              <span aria-hidden className="hidden sm:inline">·</span>
              <span className="w-full sm:w-auto">
                {u.lastLoginAt ? `Last signed in ${formatDate(u.lastLoginAt)}` : "Never signed in"}
              </span>
            </p>
          </div>
          <StaffRowActions
            userId={u.id}
            role={u.role}
            name={u.name}
            email={u.email}
            phone={u.phone}
            profilePicture={u.profilePicture}
            currentUserRole={currentUserRole}
            canManage={canManageMember(u)}
            inactive={inactive}
          />
        </li>
      ))}
    </ul>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initials = name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    <Image src={src} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-[var(--navy)]">
      {initials}
    </span>
  );
}
