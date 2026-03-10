import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import CampusShell from "@/components/campus/CampusShell";

export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <CampusShell name={session.name} role={session.role}>
      {children}
    </CampusShell>
  );
}
