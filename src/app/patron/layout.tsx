import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import PatronNavbar from "@/components/patron/PatronNavbar";

export default async function PatronLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  const initials = session.name.split(" ").map((w: string) => w[0]).slice(0,2).join("").toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <PatronNavbar initials={initials} name={session.name} />

      {/* Main content */}
      <main style={{ maxWidth: 1100, margin: "0 auto" }} className="px-4 py-6 sm:px-7 sm:py-9">
        {children}
      </main>
    </div>
  );
}
