import { format } from "date-fns";
import { MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/* Small pieces shared by the regular and ceremony booking lists. */

export function normalizeTel(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function normalizeWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}

/** "9:00 AM – 12:00 PM", or with both dates when it spans days. */
export function formatTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`
    : `${format(start, "d MMM, h:mm a")} – ${format(end, "d MMM, h:mm a")}`;
}

/** The day a booking starts on, as a small calendar tile — easy to scan down a list. */
export function DateChip({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div
      aria-hidden
      className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl border border-border/70 bg-background leading-none"
    >
      <span className="text-[0.6rem] font-medium uppercase tracking-wide text-[var(--gold)]">{format(d, "MMM")}</span>
      <span className="mt-0.5 text-base font-medium tabular-nums text-[var(--navy)]">{format(d, "d")}</span>
    </div>
  );
}

export function AcPill() {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--gold)]/10 px-2 py-0.5 text-[0.6875rem] font-medium leading-4 text-[var(--gold)]">
      AC
    </span>
  );
}

/** Call and WhatsApp links. `compact` is the icon-only pair used in list rows. */
export function ContactButtons({ phone, compact = false }: { phone: string; compact?: boolean }) {
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();
  const base = compact
    ? "hidden size-8 items-center justify-center rounded-full border border-border/70 bg-card transition-colors sm:inline-flex"
    : "inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 text-xs font-medium shadow-[var(--shadow-xs)] transition-colors";
  return (
    <div className={cn("flex items-center gap-1.5", !compact && "pt-1")}>
      <a
        href={`tel:${normalizeTel(phone)}`}
        onClick={stop}
        onKeyDown={stop}
        aria-label={`Call ${phone}`}
        title="Call"
        className={cn(base, "text-[var(--navy)] hover:bg-muted")}
      >
        <Phone size={compact ? 14 : 13} />
        {!compact && "Call"}
      </a>
      <a
        href={`https://wa.me/${normalizeWhatsApp(phone)}`}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        onKeyDown={stop}
        aria-label={`WhatsApp ${phone}`}
        title="WhatsApp"
        className={cn(base, "text-success hover:bg-success/10")}
      >
        <MessageCircle size={compact ? 14 : 13} />
        {!compact && "WhatsApp"}
      </a>
    </div>
  );
}
