import { cn } from "@/lib/utils";

/**
 * Interior visitor-page header. Light panel with a pill eyebrow and charcoal
 * type, matching VisitorHero's `plain` variant — a dark block here would read
 * as a stray section on the sand canvas.
 */
export default function GuestPageHero({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--r-2xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] md:p-8",
        className
      )}
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--gold-hsl)/0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-muted)]">
        {eyebrow}
      </div>
      <h1 className="font-display mt-4 text-[clamp(1.6rem,3vw,2.25rem)] font-bold leading-[1.15] text-[var(--navy)]">
        {title}
      </h1>
      <p className="mt-2 max-w-[640px] leading-relaxed text-[var(--text-muted)]">
        {description}
      </p>
      {children && <div className="mt-5 flex flex-wrap items-center gap-2">{children}</div>}
    </section>
  );
}
