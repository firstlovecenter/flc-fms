import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import PatronNavbar from "@/components/patron/PatronNavbar";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import BodyScope from "@/components/layout/BodyScope";
import { prisma } from "@/lib/db/prisma";

export default async function PatronLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  const initials = session.name.split(" ").map((w: string) => w[0]).slice(0,2).join("").toUpperCase();
  const account = await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true, profilePicture: true } });

  // The patron portal shares the staff portal's console theme (.surface-cool):
  // warm canvas, white rounded cards, ink pills, one orange accent.
  return (
    <div className="surface-cool min-h-dvh overflow-x-hidden bg-background">
      <BodyScope className="surface-cool" />
      {session.impersonatedBy && (
        <ImpersonationBanner
          adminName={session.impersonatedBy.name}
          targetName={session.name}
          targetRole="PATRON"
        />
      )}
      <PatronNavbar
        initials={initials}
        name={session.name}
        profilePicture={account?.profilePicture ?? undefined}
        canUseStaffContext={account?.role !== "PATRON"}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pt-5 md:pb-12">
        {children}
      </main>
    </div>
  );
}
