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

const TH = "px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap";
const TD = "px-4 py-3 align-middle";

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
    // No overflow-hidden here: each row's actions menu must be able to open
    // past the card's edge. The header band rounds its own corners instead.
    <div className={cn("rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]", inactive && "opacity-80")}>
      <table className="w-full text-sm">
        <thead className="[&_th]:bg-muted/60 [&_th:first-child]:rounded-tl-[1.25rem] [&_th:last-child]:rounded-tr-[1.25rem]">
          <tr>
            <th data-mobile="title" className={TH}>Name</th>
            <th data-mobile="badge" className={TH}>Role</th>
            <th data-mobile="meta" className={TH}>Email</th>
            <th data-mobile="meta" className={cn(TH, "sm:max-lg:hidden")}>Phone</th>
            <th data-mobile="meta" className={TH}>Last sign-in</th>
            <th className={cn(TH, "w-px")}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {members.map((u) => (
            <tr key={u.id} className="border-t border-border/60 transition-colors hover:bg-muted/40">
              <td className={TD}>
                <span className="flex items-center gap-3">
                  <span className="hidden sm:block"><Avatar name={u.name} src={u.profilePicture} /></span>
                  <span className="font-medium text-[var(--navy)]">{u.name}</span>
                </span>
              </td>
              <td className={TD}>
                <span
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-4",
                    inactive ? "bg-secondary text-secondary-foreground" : ROLE_TONE[u.role] ?? "bg-secondary text-secondary-foreground"
                  )}
                >
                  {inactive ? "Inactive" : ROLE_LABELS[u.role] ?? u.role.replace(/_/g, " ")}
                </span>
              </td>
              <td className={cn(TD, "text-[var(--slate)]")}>
                <a href={`mailto:${u.email}`} className="hover:text-[var(--navy)] hover:underline">{u.email}</a>
              </td>
              <td className={cn(TD, "whitespace-nowrap text-[var(--slate)] sm:max-lg:hidden")}>
                {u.phone ? <a href={`tel:${u.phone}`} className="hover:text-[var(--navy)] hover:underline">{u.phone}</a> : "—"}
              </td>
              <td className={cn(TD, "whitespace-nowrap text-[var(--slate)]")}>
                {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
              </td>
              <td className={TD}>
                <div className="flex justify-end">
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
