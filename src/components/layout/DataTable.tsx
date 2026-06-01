import { cn } from "@/lib/utils";

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("table-scroll-wrapper", className)}>
      <table className="data-table">{children}</table>
    </div>
  );
}

export function DataTableEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("empty-state py-16", className)}>
      {children}
    </div>
  );
}
