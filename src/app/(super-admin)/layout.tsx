import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import StaffShell from "@/components/staff-shell/StaffShell";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  return (
    <StaffShell name={session.name} role={session.role}>
      {children}
    </StaffShell>
  );
}
