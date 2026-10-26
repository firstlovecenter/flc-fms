"use client";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * One record's details beside the list it came from. Opening a row should not
 * lose the list: details live here, and dialogs are kept for confirmations.
 */
export function RecordSheet({
  open,
  onClose,
  title,
  description,
  badges,
  actions,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  badges?: React.ReactNode;
  /** Pinned to the bottom of the sheet. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className={cn(
          "gap-0 border-l-0 bg-card p-0 data-[side=right]:w-full sm:rounded-l-[1.75rem]",
          wide ? "data-[side=right]:sm:max-w-2xl" : "data-[side=right]:sm:max-w-lg"
        )}
      >
        <SheetHeader className="gap-1.5 border-b border-border/70 px-5 pb-4 pr-14 pt-5 text-left">
          <SheetTitle className="flex flex-wrap items-center gap-2 text-lg font-medium tracking-tight">
            {title}
            {badges}
          </SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">Details</SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
        {actions && (
          <div className="flex flex-wrap gap-2 border-t border-border/70 bg-muted/40 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {actions}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** A titled block inside a sheet. */
export function SheetSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Label/value pairs in two columns. Empty values are skipped. */
export function DetailGrid({
  items,
  className,
}: {
  items: Array<
    { label: string; value: React.ReactNode; full?: boolean } | null | false | "" | undefined
  >;
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3 text-sm", className)}>
      {items.map((item, i) =>
        item && item.value !== null && item.value !== undefined && item.value !== "" ? (
          <div key={`${item.label}-${i}`} className={cn("min-w-0", item.full && "col-span-2")}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 break-words text-foreground">{item.value}</dd>
          </div>
        ) : null
      )}
    </dl>
  );
}
