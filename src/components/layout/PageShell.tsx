import { cn } from "@/lib/utils";

const widths = {
  /** Fills the staff main area (default for list/dashboard pages). */
  full: "",
  /** Caps very wide screens so dense pages don't sprawl. */
  wide: "max-w-[1400px]",
  /** Reading-width content pages. */
  content: "max-w-5xl",
  /** Single-column forms and detail pages. */
  narrow: "max-w-2xl",
} as const;

/**
 * Standard page content wrapper: consistent max-width, horizontal centering,
 * vertical rhythm, and entry animation. Use inside the staff `<main>` (which
 * already supplies the outer gutters) so every page shares the same spacing.
 */
export default function PageShell({
  children,
  width = "full",
  className,
}: {
  children: React.ReactNode;
  width?: keyof typeof widths;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full space-y-6 animate-fade-in", widths[width], className)}>
      {children}
    </div>
  );
}
