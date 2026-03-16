import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Key } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { format } from "date-fns";
import StaffRowActions from "@/components/staff/StaffRowActions";

interface Props { params: { id: string } }

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:      "Super Admin",
  FACILITY_MANAGER: "Facility Manager",
  VICAR:            "Vicar",
  BOOKING_MANAGER:  "Booking Manager",
};

export default async function StaffDetailPage({ params }: Props) {
  const session = await requireStaff("FACILITY_MANAGER");

  const member = await prisma.user.findFirst({
    where: { id: params.id },
    select: {
      id: true, name: true, email: true, phone: true,
      profilePicture: true,
      role: true, isActive: true, permissions: true,
      lastLoginAt: true, createdAt: true,
    },
  });

  if (!member) notFound();

  const recentAudit = await prisma.auditLog.findMany({
    where: { userId: member.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { action: true, entity: true, createdAt: true },
  });

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/staff" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
          <p className="text-sm text-gray-400">{ROLE_LABELS[member.role] ?? member.role}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
          member.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
        }`}>
          {member.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
          <p className="font-medium text-gray-800">{member.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Phone</p>
          <p className="font-medium text-gray-800">{member.phone ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Joined</p>
          <p className="font-medium text-gray-800">{format(member.createdAt, "dd MMM yyyy")}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Last login</p>
          <p className="font-medium text-gray-800">
            {member.lastLoginAt ? format(member.lastLoginAt, "dd MMM yyyy, HH:mm") : "Never"}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {member.role === "VICAR" && (
            <Link
              href={`/staff/${member.id}/permissions`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Shield size={15} />
              Edit Permissions
            </Link>
          )}
          {/* Deactivate / Reactivate + Password reset via row actions component */}
          <StaffRowActions
            userId={member.id}
            name={member.name}
            email={member.email}
            phone={member.phone}
            inactive={!member.isActive}
            role={member.role}
            profilePicture={member.profilePicture}
            currentUserRole={session.role}
          />
        </div>
      </div>

      {/* Recent activity */}
      {recentAudit.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h2>
          <ul className="space-y-2">
            {recentAudit.map((log, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium text-gray-800">{log.action}</span>
                  {" "}
                  <span className="text-gray-400">on {log.entity}</span>
                </span>
                <span className="text-xs text-gray-400">{format(log.createdAt, "dd MMM, HH:mm")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
