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
          ? "page-hero relative z-10 overflow-hidden"
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
            <p className={cn(isHero ? "section-eyebrow mb-2" : "text-eyebrow uppercase tracking-widest text-[var(--gold)] mb-2")}>
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              isHero
                ? "page-title text-[clamp(1.75rem,2.5vw,2.5rem)]"
                : "font-display text-display-lg text-[var(--navy)] dark:text-[rgba(232,238,248,0.95)]"
            )}
          >
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "mt-2 min-w-0 break-words",
                isHero ? "page-hero-muted text-[0.95rem]" : "text-body text-[var(--text-muted)]"
              )}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
