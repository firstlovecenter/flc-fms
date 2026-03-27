import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import StaffShell from "@/components/staff-shell/StaffShell";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { profilePicture: true },
  });

  return (
    <StaffShell name={session.name} role={session.role} profilePicture={user?.profilePicture ?? undefined}>
      {children}
    </StaffShell>
  );
}
