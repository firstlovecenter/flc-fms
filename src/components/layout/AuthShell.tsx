import Link from "next/link";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthBrandLink() {
  return (
    <div className="text-center mb-7">
      <Link href="/" className="inline-flex items-center gap-2 no-underline">
        <div className="w-9 h-9 bg-[var(--navy)] rounded-[var(--r-sm)] flex items-center justify-center">
          <Home size={17} className="text-[var(--gold)]" aria-hidden />
        </div>
        <span className="text-heading-md font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.95)] font-display">
          First Love Center
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
    <div className="min-h-dvh bg-[var(--page-bg,var(--cream))] dark:bg-transparent flex items-center justify-center p-6 animate-fade-in">
      <div className={cn("w-full", className)} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
