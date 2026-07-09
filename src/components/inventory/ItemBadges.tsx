import { StatusBadge } from "@/components/ui/StatusBadge";

const CONDITION_MAP: Record<string, { label: string; classes: string }> = {
  EXCELLENT: { label: "Excellent", classes: "bg-success/10 text-success border border-success/25" },
  GOOD:      { label: "Good",      classes: "bg-info/10 text-info border border-info/25" },
  FAIR:      { label: "Fair",      classes: "bg-warning/10 text-warning border border-warning/25" },
  POOR:      { label: "Poor",      classes: "bg-danger/10 text-danger border border-danger/25" },
  DAMAGED:   { label: "Damaged",   classes: "bg-danger/10 text-danger border border-danger/25" },
  DISPOSED:  { label: "Disposed",  classes: "bg-foreground/5 text-muted-foreground border border-foreground/10" },
};

export function ConditionBadge({ condition }: { condition: string }) {
  const s = CONDITION_MAP[condition] ?? { label: condition, classes: "bg-foreground/5 text-muted-foreground border border-foreground/10" };
  return <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full ${s.classes}`}>{s.label}</span>;
}

export function ItemStatusBadge({ status }: { status: string }) {
  if (status === "IN_USE") return <StatusBadge status="CHECKED_OUT" label="In Use" />;
  if (status === "LOST")   return <StatusBadge status="FAILED" label="Lost" />;
  return <StatusBadge status={status} />;
}
