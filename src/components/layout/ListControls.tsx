import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * Controls that sit above and below a list, shared by server and client pages:
 * pill filters with counts (as buttons or links), a pill segment control for
 * in-page tabs, and "Showing 21–40 of 734" paging.
 */

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  /** Link target; when set the pill is a link instead of a button. */
  href?: string;
}

const pillClass = (active: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
    active
      ? "border-[hsl(var(--btn))] bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))]"
      : "border-border/70 bg-card text-muted-foreground shadow-[var(--shadow-xs)] hover:border-foreground/30 hover:text-foreground"
  );

function Count({ value, active }: { value?: number; active: boolean }) {
  if (typeof value !== "number") return null;
  return (
    <span className={cn("tabular-nums", active ? "opacity-70" : "text-muted-foreground/80")}>
      {value.toLocaleString()}
    </span>
  );
}

/** Pill filters with counts — the queue tabs. */
export function FilterPills({
  options,
  value,
  onChange,
  label = "Filter",
  className,
}: {
  options: FilterOption[];
  value: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return o.href ? (
          <Link key={o.value} href={o.href} aria-current={active ? "true" : undefined} className={pillClass(active)}>
            {o.label}
            <Count value={o.count} active={active} />
          </Link>
        ) : (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(o.value)}
            className={pillClass(active)}
          >
            {o.label}
            <Count value={o.count} active={active} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * In-page tabs as a pill segment control, with the active tab as the ink pill.
 * On phones the pills share the row and wrap instead of scrolling sideways.
 */
export function SegmentLinks({
  tabs,
  value,
  label,
  className,
}: {
  tabs: ReadonlyArray<{ value: string; label: string; href: string; count?: number }>;
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "flex flex-wrap gap-1 rounded-[1.25rem] border border-border/70 bg-card p-1 shadow-[var(--shadow-xs)] sm:inline-flex sm:rounded-full",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors sm:flex-none",
              active
                ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))] shadow-[var(--shadow-xs)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
            <Count value={tab.count} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Server-side paging: "Showing 21–40 of 734" with previous / next links.
 * Hidden when everything fits on one page.
 */
export function ListPagination({
  page,
  pageSize,
  total,
  hrefFor,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page <= 1) return null;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const btn =
    "inline-flex h-9 items-center rounded-full border border-border bg-card px-4 font-medium transition-colors hover:bg-muted/60";
  const disabled = "pointer-events-none opacity-50";
  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-3 text-sm", className)}>
      <p className="text-muted-foreground">
        Showing{" "}
        <span className="font-medium tabular-nums text-foreground">
          {start.toLocaleString()}–{end.toLocaleString()}
        </span>{" "}
        of <span className="font-medium tabular-nums text-foreground">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-muted-foreground sm:inline">
          Page {page} of {totalPages}
        </span>
        <Link
          href={hrefFor(page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(btn, page <= 1 && disabled)}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={cn(btn, page >= totalPages && disabled)}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
