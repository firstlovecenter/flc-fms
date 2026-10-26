import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The header a page starts with: an optional back link, the title, one plain
 * sentence on what the page is for, and the page's actions.
 *
 * `hero` is a dark band on public/patron pages; inside the staff portal
 * (.surface-cool) both variants render as the plain console header.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  meta,
  variant = "default",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  /** A line under the description — e.g. "Updated 10:42". */
  meta?: React.ReactNode;
  variant?: "default" | "hero";
  className?: string;
}) {
  const isHero = variant === "hero";

  return (
    <header
      data-page-header={variant}
      className={cn(
        isHero
          ? "relative z-10 overflow-hidden rounded-[var(--r-md)] border border-[var(--page-hero-border)] bg-[image:var(--page-hero-bg)] px-7 py-6 text-[var(--page-hero-fg)] shadow-[var(--shadow-md)]"
          : "mb-6",
        className
      )}
    >
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-card pl-2 pr-3 text-sm text-muted-foreground shadow-[var(--shadow-xs)] transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div
        className={cn(
          "flex flex-col gap-4",
          actions && "sm:flex-row sm:items-start sm:justify-between"
        )}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p
              data-page-header-eyebrow
              className={cn(
                "mb-2 text-eyebrow uppercase tracking-widest",
                isHero ? "text-[var(--gold-bright)]" : "text-gold"
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1
            data-page-header-title
            className={cn(
              "text-balance",
              isHero
                ? "font-display text-[clamp(1.75rem,2.5vw,2.5rem)] font-bold leading-tight text-[var(--page-hero-fg)]"
                : "font-display text-display-lg text-[var(--navy)] dark:text-[rgba(232,238,248,0.95)]"
            )}
          >
            {title}
          </h1>
          {description && (
            <div
              data-page-header-description
              className={cn(
                "mt-2 min-w-0 break-words",
                isHero
                  ? "text-[0.95rem] text-[var(--page-hero-muted)]"
                  : "text-body text-muted-foreground"
              )}
            >
              {description}
            </div>
          )}
          {meta && <div className="mt-1.5 text-xs text-muted-foreground">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
