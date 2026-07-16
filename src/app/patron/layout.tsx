import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import PatronNavbar from "@/components/patron/PatronNavbar";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { prisma } from "@/lib/db/prisma";

export default async function PatronLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  const initials = session.name.split(" ").map((w: string) => w[0]).slice(0,2).join("").toUpperCase();
  const account = await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true } });

  return (
    <div className="surface-warm min-h-dvh bg-cream dark:bg-transparent overflow-x-hidden">
      {session.impersonatedBy && (
        <ImpersonationBanner
          adminName={session.impersonatedBy.name}
          targetName={session.name}
          targetRole="PATRON"
        />
      )}
      <PatronNavbar initials={initials} name={session.name} canUseStaffContext={account?.role !== "PATRON"} />

      <main className="max-w-[1100px] mx-auto px-4 py-6 sm:px-7 sm:py-9">
        {children}
      </main>
    </div>
  );
}
