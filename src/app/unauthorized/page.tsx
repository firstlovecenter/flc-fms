import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-medium text-[var(--navy)] mb-2">Access Denied</h1>
        <p className="text-[var(--muted)] mb-6">
          You don&apos;t have permission to view this page. Contact your Facility Manager if you need access.
        </p>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "default" }))}>Go to Dashboard</Link>
      </div>
    </div>
  );
}
