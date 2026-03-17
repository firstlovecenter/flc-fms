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

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
  pulse?: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40",
    pulse: true,
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className:
      "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: Ban,
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCheck,
    className:
      "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40",
  },
  PAID: {
    label: "Paid",
    icon: CreditCard,
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40",
  },
  UNPAID: {
    label: "Unpaid",
    icon: AlertCircle,
    className:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    className:
      "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40",
  },
  REFUNDED: {
    label: "Refunded",
    icon: RefreshCw,
    className:
      "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/40",
  },
  OPEN: {
    label: "Open",
    icon: CircleDot,
    className:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40",
    pulse: true,
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: TrendingUp,
    className:
      "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40",
  },
  RESOLVED: {
    label: "Resolved",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40",
  },
  CLOSED: {
    label: "Closed",
    icon: Ban,
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  },
  LOW: {
    label: "Low",
    icon: CircleDot,
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  },
  MEDIUM: {
    label: "Medium",
    icon: AlertCircle,
    className:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40",
  },
  HIGH: {
    label: "High",
    icon: AlertCircle,
    className:
      "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/40",
  },
  CRITICAL: {
    label: "Critical",
    icon: XCircle,
    className:
      "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40",
    pulse: true,
  },
  AVAILABLE: {
    label: "Available",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40",
  },
  CHECKED_OUT: {
    label: "Checked Out",
    icon: Package,
    className:
      "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40",
  },
  UNDER_MAINTENANCE: {
    label: "Maintenance",
    icon: Wrench,
    className:
      "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/40",
  },
  DISPOSED: {
    label: "Disposed",
    icon: Ban,
    className:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  },
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
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
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
        config.className,
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
