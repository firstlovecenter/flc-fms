import Link from "next/link";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthBrandLink() {
  return (
    <div className="mb-6 flex justify-center">
      <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
        <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--hero-from,var(--gold-hsl)))] to-[hsl(var(--hero-to,var(--gold-muted-hsl)))] text-[#fff] shadow-[0_6px_16px_-6px_hsl(var(--hero-to,var(--gold-muted-hsl))/0.6)]">
          <Home size={18} aria-hidden />
        </span>
        <span className="text-left leading-none">
          <span className="block text-base font-semibold tracking-tight text-[var(--navy)]">First Love Center</span>
          <span className="mt-1 block text-xs font-medium text-[var(--muted)]">Facility management</span>
        </span>
      </Link>
    </div>
  );
}

export default function AuthShell({
  children,
  className,
  maxWidth = 400,
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: number;
}) {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4 py-10 sm:p-6 animate-fade-in">
      <div className={cn("w-full", className)} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
