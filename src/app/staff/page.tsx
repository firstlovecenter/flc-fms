import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { cn, formatDate } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import AddStaffModal from "@/components/staff/AddStaffModal";
import StaffRowActions from "@/components/staff/StaffRowActions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function StaffPage() {
  const session = await requireStaff("FACILITY_MANAGER");

  const [activeStaff, inactiveStaff] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { not: "SUPER_ADMIN" } },
      select: { id: true, name: true, email: true, phone: true, role: true, lastLoginAt: true, profilePicture: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { isActive: false, role: { not: "SUPER_ADMIN" } },
      select: { id: true, name: true, email: true, phone: true, role: true, lastLoginAt: true, profilePicture: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const activeFms = activeStaff.filter((u) => u.role === "FACILITY_MANAGER").length;
  const activeVicars = activeStaff.filter((u) => u.role === "VICAR").length;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="absolute top-[-100px] right-[-80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }} />

      <PageHeader
        variant="hero"
        eyebrow="Administration"
        title="Staff Management"
        description={`${activeStaff.length} active staff • ${activeFms} Facility Manager${activeFms !== 1 ? "s" : ""} • ${activeVicars} Vicar${activeVicars !== 1 ? "s" : ""}`}
        className="relative z-10"
        actions={<AddStaffModal canAssignSuperAdmin={session.role === "SUPER_ADMIN"} />}
      />

      <Card className="relative z-10 p-0 gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Phone</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Last Login</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeStaff.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                  <td className="py-3 px-4 font-medium text-[var(--navy)]">{u.name}</td>
                  <td className="py-3 px-4 text-[var(--slate)]">{u.email}</td>
                  <td className="py-3 px-4 text-[var(--slate)]">{u.phone ?? "—"}</td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "text-[0.8rem] font-semibold px-[10px] py-1 rounded-[20px]",
                        u.role === "SUPER_ADMIN"
                          ? "bg-inventory/10 text-inventory"
                          : u.role === "FACILITY_MANAGER"
                            ? "bg-gold/10 text-gold"
                            : "bg-warning/10 text-warning"
                      )}
                    >
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)] text-[0.9rem]">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status="APPROVED" label="Active" size="xs" />
                  </td>
                  <td className="py-3 px-4">
                    <StaffRowActions
                      userId={u.id}
                      role={u.role}
                      name={u.name}
                      email={u.email}
                      phone={u.phone}
                      profilePicture={u.profilePicture}
                      currentUserRole={session.role}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {inactiveStaff.length > 0 && (
        <Card className="relative z-10 opacity-85 p-0 gap-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] font-semibold text-[var(--navy)]">
            Inactive Staff ({inactiveStaff.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Last Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--navy)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inactiveStaff.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                    <td className="py-3 px-4 font-medium text-[var(--navy)]">{u.name}</td>
                    <td className="py-3 px-4 text-[var(--slate)]">{u.email}</td>
                    <td className="py-3 px-4 text-[var(--slate)]">{u.phone ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "text-[0.8rem] font-semibold px-[10px] py-1 rounded-[20px]",
                          u.role === "SUPER_ADMIN"
                            ? "bg-inventory/10 text-inventory"
                            : u.role === "FACILITY_MANAGER"
                              ? "bg-gold/10 text-gold"
                              : "bg-warning/10 text-warning"
                        )}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] text-[0.9rem]">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status="CANCELLED" label="Inactive" size="xs" />
                    </td>
                    <td className="py-3 px-4">
                      <StaffRowActions
                        userId={u.id}
                        role={u.role}
                        name={u.name}
                        email={u.email}
                        phone={u.phone}
                        profilePicture={u.profilePicture}
                        currentUserRole={session.role}
                        inactive
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
