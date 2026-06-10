import { cn } from "@/lib/utils";

export function DataTable({
  children,
  className,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  /** Staff-density rows (smaller padding, body-sm) */
  compact?: boolean;
}) {
  return (
    <div className={cn("table-scroll-wrapper -mx-1 px-1", className)}>
      <table
        className={cn(
          "data-table w-full min-w-[640px] border-collapse",
          compact && "text-body-sm"
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function DataTableEmpty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center text-muted-foreground dark:bg-[hsl(var(--ui-card))]/50",
        className
      )}
    >
      {children}
    </div>
  );
}
