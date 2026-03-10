import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2}).format(amount);
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short"}).format(new Date(date));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(date));
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    PENDING:     "badge-pending",
    APPROVED:    "badge-approved",
    REJECTED:    "badge-rejected",
    COMPLETED:   "badge-completed",
    CANCELLED:   "badge-cancelled",
    OPEN:        "badge-open",
    IN_PROGRESS: "badge-progress",
    RESOLVED:    "badge-resolved",
    CLOSED:      "badge-cancelled",
    CRITICAL:    "badge-critical",
    HIGH:        "badge-high",
    MEDIUM:      "badge-medium",
    LOW:         "badge-low"};
  return map[status] ?? "badge-pending";
}

export function durationHours(start: Date | string, end: Date | string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return (ms / 3_600_000).toFixed(1);
}
