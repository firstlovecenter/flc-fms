"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, CalendarDays, X, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDateTime, durationHours, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";
import DeleteBookingButton from "@/components/bookings/DeleteBookingButton";
import { RecordSheet, SheetSection, DetailGrid } from "@/components/layout/RecordSheet";
import { FilterPills } from "@/components/layout/ListControls";
import { ContactButtons } from "@/components/bookings/booking-list-parts";
import BookingTable from "@/components/bookings/BookingTable";

export type CeremonyBookingRow = {
  id: string;
  title: string;
  facilityName: string;
  status: string;
  totalAmount: number;
  acRequested: boolean;
  startTime: string;
  endTime: string;
  bookerName: string;
  bookerPhone: string | null;
  bookerEmail: string | null;
  createdByStaffName: string | null;
  rejectionReason: string | null;
  notes: string | null;
  // Ceremony-specific
  ceremonyType: "wedding" | "naming" | null;
  ceremonyCodeValue: string | null;
  // Wedding fields
  brideName?: string | null;
  groomName?: string | null;
  contactWhatsApp?: string | null;
  // Naming fields
  fatherName?: string | null;
  motherName?: string | null;
  childrenNames?: string | null;
  childBirthday?: string | null;
  pastorName?: string | null;
};

interface Props {
  bookings: CeremonyBookingRow[];
  canManage: boolean;
  isSuperAdmin: boolean;
}

const TYPE_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "WEDDING", label: "Weddings" },
  { value: "NAMING", label: "Namings" },
];

function TypePill({ type }: { type: CeremonyBookingRow["ceremonyType"] }) {
  if (!type) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-4",
        type === "wedding" ? "bg-[hsl(330_70%_50%/0.1)] text-[hsl(330_60%_42%)]" : "bg-info/10 text-info"
      )}
    >
      {type === "wedding" ? "Wedding" : "Naming"}
    </span>
  );
}

function principalNames(b: CeremonyBookingRow) {
  if (b.ceremonyType === "wedding") {
    if (b.brideName && b.groomName) return `${b.brideName} & ${b.groomName}`;
    return b.brideName ?? b.groomName ?? "—";
  }
  if (b.ceremonyType === "naming") {
    const child = b.childrenNames ?? "—";
    const parents = [b.fatherName, b.motherName].filter(Boolean).join(" & ");
    return parents ? `${child} (${parents})` : child;
  }
  return b.title || "—";
}

/** Ceremony bookings on this page. Status is filtered on the server (the pills above the list). */
export default function CeremonyBookingsTable({ bookings, canManage, isSuperAdmin }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const filtered = bookings.filter((b) => {
    if (deletedIds.has(b.id)) return false;
    if (typeFilter === "WEDDING" && b.ceremonyType !== "wedding") return false;
    if (typeFilter === "NAMING" && b.ceremonyType !== "naming") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const names = [b.title, b.bookerName, b.brideName, b.groomName, b.fatherName, b.motherName, b.childrenNames, b.ceremonyCodeValue]
        .filter(Boolean).join(" ").toLowerCase();
      if (!names.includes(q)) return false;
    }
    return true;
  });

  const selected = useMemo(() => bookings.find((b) => b.id === selectedId) ?? null, [bookings, selectedId]);

  const hasActiveFilters = !!(search || typeFilter !== "ALL");

  function clearFilters() {
    setSearch("");
    setTypeFilter("ALL");
  }

  function closeModal() {
    setSelectedId(null);
  }

  function handleDeleted() {
    if (!selectedId) return;
    setDeletedIds((prev) => new Set(prev).add(selectedId));
    closeModal();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search names or ceremony code…"
            aria-label="Search ceremony bookings"
            className="h-10 min-h-10 !rounded-full bg-card pl-10 pr-9 text-sm shadow-[var(--shadow-xs)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--muted)] hover:text-[var(--navy)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <FilterPills label="Ceremony type" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
        <p className="shrink-0 text-sm text-[var(--muted)] sm:ml-auto">
          <span className="font-medium tabular-nums text-[var(--navy)]">{filtered.length}</span> on this page
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={hasActiveFilters ? "No matching ceremonies" : "No ceremony bookings here yet"}
          description={
            hasActiveFilters
              ? "Nothing on this page matches your search and filters."
              : "Weddings and namings appear here when they're booked with a ceremony code or by staff."
          }
          action={
            hasActiveFilters ? (
              <Button type="button" variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                <X size={12} /> Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <BookingTable
          onOpen={setSelectedId}
          rows={filtered.map((b) => ({
            id: b.id,
            title: principalNames(b),
            tags: <TypePill type={b.ceremonyType} />,
            subtitle: b.ceremonyCodeValue ? (
              <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-[var(--navy)]">{b.ceremonyCodeValue}</code>
            ) : b.title,
            facility: b.facilityName,
            startTime: b.startTime,
            endTime: b.endTime,
            booker: b.bookerName,
            bookerNote: b.createdByStaffName ? `Booked by ${b.createdByStaffName}` : null,
            phone: b.bookerPhone,
            amount: b.totalAmount,
            status: b.status,
            ac: b.acRequested,
          }))}
        />
      )}

      <RecordSheet
        open={!!selected}
        onClose={closeModal}
        title={selected ? principalNames(selected) : ""}
        badges={selected ? (
          <>
            <TypePill type={selected.ceremonyType} />
            <StatusBadge status={selected.status} size="sm" />
          </>
        ) : null}
        description={selected ? `${selected.facilityName} · ${selected.title}` : undefined}
        actions={selected && (canManage || isSuperAdmin) ? (
          <>
            {canManage && selected.status === "PENDING" && <BookingActions bookingId={selected.id} />}
            {canManage && selected.status === "APPROVED" && <CompleteBookingButton bookingId={selected.id} />}
            {canManage && ["PENDING", "APPROVED"].includes(selected.status) && <CancelBookingButton bookingId={selected.id} />}
            {isSuperAdmin && <DeleteBookingButton bookingId={selected.id} onDeleted={handleDeleted} />}
          </>
        ) : undefined}
      >
        {selected && (
          <>
            <div className="rounded-[1.25rem] bg-muted/60 p-4">
              <p className="text-xs text-[var(--muted)]">Amount</p>
              <p className="mt-1 text-2xl font-medium tabular-nums tracking-tight text-[var(--navy)]">{formatCurrency(selected.totalAmount)}</p>
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                {selected.acRequested ? "AC requested — cash donation at the Front Office." : "No AC requested."}
              </p>
            </div>

            {selected.rejectionReason && (
              <div className="alert alert-error">
                <span><strong className="font-medium">Rejected:</strong> {selected.rejectionReason}</span>
              </div>
            )}

            <SheetSection title="Schedule">
              <DetailGrid
                items={[
                  { label: "Date", value: formatDateTime(new Date(selected.startTime)) },
                  { label: "Duration", value: `${durationHours(new Date(selected.startTime), new Date(selected.endTime))} hours` },
                  selected.ceremonyCodeValue && {
                    label: "Ceremony code",
                    value: <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">{selected.ceremonyCodeValue}</code>,
                  },
                ]}
              />
            </SheetSection>

            {selected.ceremonyType === "wedding" && (
              <SheetSection title="Wedding">
                <DetailGrid
                  items={[
                    { label: "Bride", value: selected.brideName ?? "—" },
                    { label: "Groom", value: selected.groomName ?? "—" },
                    selected.contactWhatsApp && { label: "Contact (WhatsApp)", value: selected.contactWhatsApp },
                  ]}
                />
              </SheetSection>
            )}

            {selected.ceremonyType === "naming" && (
              <SheetSection title="Naming ceremony">
                <DetailGrid
                  items={[
                    { label: "Child", value: selected.childrenNames ?? "—" },
                    { label: "Birthday", value: selected.childBirthday ?? "—" },
                    { label: "Father", value: selected.fatherName ?? "—" },
                    { label: "Mother", value: selected.motherName ?? "—" },
                    selected.pastorName && { label: "Pastor", value: selected.pastorName },
                  ]}
                />
              </SheetSection>
            )}

            <SheetSection title="Booker">
              <DetailGrid
                items={[
                  { label: "Name", value: selected.bookerName || "—" },
                  { label: "Source", value: selected.createdByStaffName ? `Staff — ${selected.createdByStaffName}` : "Patron request" },
                  selected.bookerPhone && { label: "Phone", value: selected.bookerPhone },
                  selected.bookerEmail && { label: "Email", value: selected.bookerEmail },
                ]}
              />
              {selected.bookerPhone && <ContactButtons phone={selected.bookerPhone} />}
            </SheetSection>

            {selected.notes && (
              <SheetSection title="Notes">
                <p className="whitespace-pre-line text-sm text-[var(--navy)]">{selected.notes}</p>
              </SheetSection>
            )}

            <Link
              href={`/bookings/${selected.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] hover:underline"
            >
              Open full booking page <ArrowUpRight size={14} />
            </Link>
          </>
        )}
      </RecordSheet>
    </div>
  );
}
