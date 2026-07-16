import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStaffAuthContext } from "@/lib/permissions/session";
import { prisma } from "@/lib/db/prisma";
import StaffShell from "@/components/staff-shell/StaffShell";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, authCtx] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { profilePicture: true, isPatron: true },
    }),
    session.role === "SUPER_ADMIN" ? null : getStaffAuthContext(session.sub),
  ]);

  return (
    <StaffShell
      name={session.name}
      role={session.role}
      profilePicture={user?.profilePicture ?? undefined}
      canUsePatronContext={user?.isPatron ?? false}
      permissions={authCtx?.permissions}
      impersonatedBy={session.impersonatedBy}
    >
      {children}
    </StaffShell>
  );
}
