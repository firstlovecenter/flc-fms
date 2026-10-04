import { cn } from "@/lib/utils";

/**
 * Standard visitor-page section: an accent eyebrow, a display heading, a calm
 * supporting line, and optional right-aligned meta. Keeps the eyebrow →
 * heading → sub rhythm consistent across every public page.
 */
export default function VisitorSection({
  eyebrow,
  title,
  description,
  meta,
  children,
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section className={cn("py-10 sm:py-14", className)} aria-labelledby={headingId}>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold-muted)]">
              {eyebrow}
            </p>
          )}
          <h2
            id={headingId}
            className="font-display text-2xl font-bold text-[var(--navy)] sm:text-3xl"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">{description}</p>
          )}
        </div>
        {meta && (
          <span className="shrink-0 text-sm text-[var(--text-muted)]">{meta}</span>
        )}
      </div>
      {children}
    </section>
  );
}
