import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import PatronNavbar from "@/components/patron/PatronNavbar";

export default async function PatronLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  const initials = session.name.split(" ").map((w: string) => w[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--cream)] dark:bg-transparent">
      <PatronNavbar initials={initials} name={session.name} />
      <main className="max-w-[1100px] mx-auto px-4 py-6 sm:px-7 sm:py-9">
        {children}
      </main>
    </div>
  );
}
