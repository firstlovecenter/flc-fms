import { cn } from "@/lib/utils";

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = "default",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "default" | "hero";
  className?: string;
}) {
  const isHero = variant === "hero";

  return (
    <header
      className={cn(
        isHero
          ? "relative z-10 overflow-hidden rounded-[var(--r-md)] border border-[var(--page-hero-border)] bg-[image:var(--page-hero-bg)] px-7 py-6 text-[var(--page-hero-fg)] shadow-[var(--shadow-md)]"
          : "mb-6",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          actions && "sm:flex-row sm:items-start sm:justify-between"
        )}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p
              className={cn(
                "mb-2 text-eyebrow uppercase tracking-widest",
                isHero ? "text-[var(--gold-bright)]" : "text-gold"
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1
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
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
