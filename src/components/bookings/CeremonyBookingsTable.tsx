"use client";

import { useMemo, useState } from "react";
import { Phone, MessageCircle, Search, CalendarDays, ChevronRight } from "lucide-react";
import { formatCurrency, formatDateTime, durationHours } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";
import DeleteBookingButton from "@/components/bookings/DeleteBookingButton";

export type CeremonyBookingRow = {
  id: string;
  title: string;
  facilityName: string;
  status: string;
  totalAmount: number;
  startTime: string;
  endTime: string;
  bookerName: string;
  bookerPhone: string | null;
  bookerEmail: string | null;
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

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];

function normalizeTel(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}

function typeLabel(type: CeremonyBookingRow["ceremonyType"]) {
  if (type === "wedding") return <span className="badge bg-pink-50 text-pink-700 border border-pink-200">Wedding</span>;
  if (type === "naming") return <span className="badge bg-info/10 text-info border border-info/25">Naming</span>;
  return <span className="text-[var(--muted)] text-xs">—</span>;
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
  return "—";
}

export default function CeremonyBookingsTable({ bookings, canManage, isSuperAdmin }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const filtered = bookings.filter((b) => {
    if (deletedIds.has(b.id)) return false;
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code…"
            className="pl-8 text-sm py-1.5 w-56"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s
                  ? "bg-[var(--navy)] text-white border-[var(--navy)]"
                  : "bg-white text-[var(--slate)] border-[var(--border)] hover:border-[var(--navy)]"
              }`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(["ALL", "WEDDING", "NAMING"] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                typeFilter === t
                  ? "bg-[var(--gold)] text-[#fff] border-[var(--gold)]"
                  : "bg-white text-[var(--slate)] border-[var(--border)] hover:border-[var(--gold)]"
              }`}>
              {t === "ALL" ? "All Types" : t === "WEDDING" ? "Weddings" : "Namings"}
            </button>
          ))}
        </div>

        <span className="text-xs text-[var(--muted)] sm:ml-auto">{filtered.length} booking{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title="No ceremony bookings found"
            description="No ceremony bookings match your current filters."
          />
        ) : (
          filtered.map((b) => (
            <Card
              key={b.id}
              role="button"
              tabIndex={0}
              className="block w-full text-left hover:shadow-md transition-shadow p-3 px-4 gap-0 py-3 cursor-pointer"
              onClick={() => setSelectedId(b.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(b.id);
                }
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {typeLabel(b.ceremonyType)}
                    <span className="font-semibold text-[var(--navy)] text-sm truncate">{principalNames(b)}</span>
                    <StatusBadge status={b.status} size="xs" />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)] flex-wrap">
                    {b.bookerName && b.bookerName !== "—" && <span>Booked by {b.bookerName}</span>}
                    <span>•</span>
                    <span>{b.facilityName}</span>
                    <span>•</span>
                    <span>{formatDateTime(new Date(b.startTime))}</span>
                    {b.ceremonyCodeValue && (
                      <>
                        <span>•</span>
                        <code className="text-[11px] bg-[var(--cream)] px-1.5 py-0.5 rounded font-mono border border-[var(--border)]">
                          {b.ceremonyCodeValue}
                        </code>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-[var(--gold)] text-sm">{formatCurrency(b.totalAmount)}</span>
                  <ChevronRight size={16} className="text-[var(--muted)]" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {typeLabel(selected.ceremonyType)}
                  <h2 className="text-lg font-semibold text-[var(--navy)]">{principalNames(selected)}</h2>
                </div>
                <p className="text-xs text-[var(--muted)]">{selected.facilityName} • {selected.title}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={closeModal}>Close</Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="p-3 gap-0 py-3">
                  <p className="text-xs text-[var(--muted)] mb-1.5">Status</p>
                  <StatusBadge status={selected.status} size="sm" />
                </Card>
                <Card className="p-3 gap-0 py-3">
                  <p className="text-xs text-[var(--muted)]">Amount</p>
                  <p className="font-semibold text-[var(--gold)]">{formatCurrency(selected.totalAmount)}</p>
                </Card>
                {selected.ceremonyCodeValue && (
                  <Card className="p-3 gap-0 py-3">
                    <p className="text-xs text-[var(--muted)]">Ceremony Code</p>
                    <code className="text-xs font-mono">{selected.ceremonyCodeValue}</code>
                  </Card>
                )}
              </div>

              <div className="text-sm">
                <p>
                  <strong>Booked By:</strong> {selected.bookerName || "-"} {selected.bookerPhone ? `(${selected.bookerPhone})` : ""}
                </p>
                {selected.bookerPhone && (
                  <div className="flex items-center gap-3 mt-1.5 mb-1">
                    <a
                      href={`tel:${normalizeTel(selected.bookerPhone)}`}
                      className="inline-flex items-center gap-1 text-xs text-[var(--navy)] hover:underline"
                    >
                      <Phone size={12} /> Call Booker
                    </a>
                    <a
                      href={`https://wa.me/${normalizeWhatsApp(selected.bookerPhone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                    >
                      <MessageCircle size={12} /> WhatsApp Booker
                    </a>
                  </div>
                )}
                <p><strong>Date:</strong> {formatDateTime(new Date(selected.startTime))}</p>
                <p><strong>Duration:</strong> {durationHours(new Date(selected.startTime), new Date(selected.endTime))} hours</p>
                {selected.notes && <p className="mt-2"><strong>Notes:</strong> {selected.notes}</p>}
                {selected.rejectionReason && <p className="mt-2 text-danger"><strong>Rejection:</strong> {selected.rejectionReason}</p>}
              </div>

              {selected.ceremonyType === "wedding" && (
                <Card className="p-4 gap-0 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Wedding Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <p><strong>Bride:</strong> {selected.brideName ?? "—"}</p>
                    <p><strong>Groom:</strong> {selected.groomName ?? "—"}</p>
                    {selected.contactWhatsApp && <p><strong>Contact (WhatsApp):</strong> {selected.contactWhatsApp}</p>}
                  </div>
                </Card>
              )}

              {selected.ceremonyType === "naming" && (
                <Card className="p-4 gap-0 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Naming Ceremony Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <p><strong>Child:</strong> {selected.childrenNames ?? "—"}</p>
                    <p><strong>Birthday:</strong> {selected.childBirthday ?? "—"}</p>
                    <p><strong>Father:</strong> {selected.fatherName ?? "—"}</p>
                    <p><strong>Mother:</strong> {selected.motherName ?? "—"}</p>
                    {selected.pastorName && <p><strong>Pastor:</strong> {selected.pastorName}</p>}
                  </div>
                </Card>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
                {canManage && selected.status === "PENDING" && <BookingActions bookingId={selected.id} />}
                {canManage && selected.status === "APPROVED" && <CompleteBookingButton bookingId={selected.id} />}
                {canManage && ["PENDING", "APPROVED"].includes(selected.status) && <CancelBookingButton bookingId={selected.id} />}
                {isSuperAdmin && <DeleteBookingButton bookingId={selected.id} onDeleted={handleDeleted} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
