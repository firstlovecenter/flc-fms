import { cn } from "@/lib/utils";

/**
 * Header for a section *within* a page (an `<h2>`), as opposed to `PageHeader`
 * which owns the page-level `<h1>`. Standardizes the eyebrow + title + action
 * pattern that pages currently hand-roll with raw `.page-header`/`.page-title`.
 */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="section-eyebrow mb-1">{eyebrow}</p>}
        <h2 className="font-display text-heading-md font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.95)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
