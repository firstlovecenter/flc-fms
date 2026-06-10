"use client";

import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  CheckCheck,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Wrench,
  CircleDot,
  TrendingUp,
  Package,
} from "lucide-react";

type Status =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "PAID"
  | "UNPAID"
  | "FAILED"
  | "REFUNDED"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  | "AVAILABLE"
  | "CHECKED_OUT"
  | "UNDER_MAINTENANCE"
  | "DISPOSED"
  | string;

/** Semantic tones — all colors flow from design tokens, dark mode adapts
    automatically because the token channels brighten in `.dark`. */
const TONE = {
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger:  "bg-danger/10 text-danger border-danger/25",
  info:    "bg-info/10 text-info border-info/25",
  violet:  "bg-inventory/10 text-inventory border-inventory/25",
  orange:  "bg-maintenance/10 text-maintenance border-maintenance/25",
  neutral: "bg-foreground/5 text-muted-foreground border-foreground/10",
} as const;

type Tone = keyof typeof TONE;

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  tone: Tone;
  pulse?: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  PENDING:           { label: "Pending",     icon: Clock,        tone: "warning", pulse: true },
  APPROVED:          { label: "Approved",    icon: CheckCircle2, tone: "success" },
  REJECTED:          { label: "Rejected",    icon: XCircle,      tone: "danger" },
  CANCELLED:         { label: "Cancelled",   icon: Ban,          tone: "neutral" },
  COMPLETED:         { label: "Completed",   icon: CheckCheck,   tone: "info" },
  PAID:              { label: "Paid",        icon: CreditCard,   tone: "success" },
  UNPAID:            { label: "Unpaid",      icon: AlertCircle,  tone: "warning" },
  FAILED:            { label: "Failed",      icon: XCircle,      tone: "danger" },
  REFUNDED:          { label: "Refunded",    icon: RefreshCw,    tone: "violet" },
  OPEN:              { label: "Open",        icon: CircleDot,    tone: "orange", pulse: true },
  IN_PROGRESS:       { label: "In Progress", icon: TrendingUp,   tone: "info" },
  RESOLVED:          { label: "Resolved",    icon: CheckCircle2, tone: "success" },
  CLOSED:            { label: "Closed",      icon: Ban,          tone: "neutral" },
  LOW:               { label: "Low",         icon: CircleDot,    tone: "neutral" },
  MEDIUM:            { label: "Medium",      icon: AlertCircle,  tone: "warning" },
  HIGH:              { label: "High",        icon: AlertCircle,  tone: "orange" },
  CRITICAL:          { label: "Critical",    icon: XCircle,      tone: "danger", pulse: true },
  AVAILABLE:         { label: "Available",   icon: CheckCircle2, tone: "success" },
  CHECKED_OUT:       { label: "Checked Out", icon: Package,      tone: "info" },
  UNDER_MAINTENANCE: { label: "Maintenance", icon: Wrench,       tone: "orange" },
  DISPOSED:          { label: "Disposed",    icon: Ban,          tone: "neutral" },
};

interface StatusBadgeProps {
  status: Status;
  /** Override the display label */
  label?: string;
  /** Show/hide the icon prefix */
  showIcon?: boolean;
  /** Size variant */
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = "sm",
  className,
}: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    icon: CircleDot,
    tone: "neutral" as Tone,
  };

  const Icon = config.icon;

  const sizeClasses = {
    xs: "text-[0.6rem] px-1.5 py-0.5 gap-1 [&_svg]:size-2.5",
    sm: "text-[0.7rem] px-2 py-0.5 gap-1 [&_svg]:size-3",
    md: "text-xs px-2.5 py-1 gap-1.5 [&_svg]:size-3.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-semibold leading-none tracking-wide whitespace-nowrap select-none",
        sizeClasses[size],
        TONE[config.tone],
        className,
      )}
    >
      {showIcon && (
        <Icon
          className={cn("shrink-0", config.pulse && "animate-pulse")}
          strokeWidth={2}
        />
      )}
      {label ?? config.label}
    </span>
  );
}
