"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateTime, durationHours } from "@/lib/utils";
import { Phone, MessageCircle, Search, Filter, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";
import SendSMSButton from "@/components/bookings/SendSMSButton";
import { updateBookingByManager } from "@/actions/booking.actions";

type BookingItem = {
  id: string;
  title: string;
  description: string | null;
  facilityId: string | null;
  facilityName: string;
  category: string;
  status: string;
  totalAmount: number;
  startTime: string;
  endTime: string;
  notes: string | null;
  rejectionReason: string | null;
  bookerName: string;
  bookerPhone: string | null;
  bookerEmail: string | null;
};

type FacilityOption = {
  id: string;
  name: string;
  categories: string[];
};

type CategoryOption = {
  slug: string;
  name: string;
};

function labelForCategory(slug: string, categories: CategoryOption[]) {
  const hit = categories.find((c) => c.slug === slug);
  return hit ? hit.name : slug.replace(/_/g, " ");
}

function normalizeTel(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}

export default function BookingsListClient({
  initialBookings,
  canManage,
  isSuperAdmin,
  facilities,
  categories,
}: {
  initialBookings: BookingItem[];
  canManage: boolean;
  isSuperAdmin: boolean;
  facilities: FacilityOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);

  // Sync client state when server-rendered data changes (e.g. filter navigation)
  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFacility, setFilterFacility] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const hasActiveFilters = !!(searchQuery || filterFacility || filterCategory || filterDateFrom || filterDateTo || filterDay);

  function clearFilters() {
    setSearchQuery("");
    setFilterFacility("");
    setFilterCategory("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterDay("");
  }

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          b.title.toLowerCase().includes(q) ||
          b.bookerName.toLowerCase().includes(q) ||
          (b.bookerPhone && b.bookerPhone.includes(q)) ||
          b.facilityName.toLowerCase().includes(q) ||
          (b.notes && b.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      // Facility
      if (filterFacility && b.facilityId !== filterFacility) return false;
      // Category
      if (filterCategory && b.category !== filterCategory) return false;
      // Date range
      if (filterDateFrom) {
        const from = new Date(filterDateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(b.startTime) < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(b.startTime) > to) return false;
      }
      // Day of week
      if (filterDay !== "") {
        const dayNum = parseInt(filterDay, 10);
        if (new Date(b.startTime).getDay() !== dayNum) return false;
      }
      return true;
    });
  }, [bookings, searchQuery, filterFacility, filterCategory, filterDateFrom, filterDateTo, filterDay]);

  // ── End Filters ──────────────────────────────────────────────────────────

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(() => bookings.find((b) => b.id === selectedId) ?? null, [bookings, selectedId]);

  const [form, setForm] = useState({
    facilityId: "",
    category: "",
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    notes: "",
  });

  const formFacility = facilities.find((f) => f.id === form.facilityId) ?? null;
  const formCategories = formFacility
    ? categories.filter((c) => formFacility.categories.includes(c.slug))
    : categories;

  function openModal(booking: BookingItem) {
    setSelectedId(booking.id);
    setEditing(false);
    setError(null);
    setForm({
      facilityId: booking.facilityId ?? "",
      category: booking.category,
      title: booking.title,
      description: booking.description ?? "",
      startTime: booking.startTime.slice(0, 16),
      endTime: booking.endTime.slice(0, 16),
      notes: booking.notes ?? "",
    });
  }

  function closeModal() {
    setSelectedId(null);
    setEditing(false);
    setError(null);
  }

  function saveEdit() {
    if (!selected) return;
    setError(null);

    startTransition(async () => {
      const result = await updateBookingByManager(selected.id, {
        facilityId: form.facilityId,
        category: form.category,
        title: form.title,
        description: form.description || undefined,
        startTime: new Date(form.startTime),
        endTime: new Date(form.endTime),
        notes: form.notes || undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error as string);
        return;
      }

      if (!("booking" in result) || !result.booking) {
        setError("Booking was updated but response payload was incomplete.");
        return;
      }

      const updated = result.booking;
      setBookings((prev) =>
        prev.map((b) =>
          b.id === selected.id
            ? {
                ...b,
                title: updated.title,
                description: updated.description ?? null,
                facilityId: updated.facilityId,
                facilityName: updated.facility?.name ?? "N/A",
                category: updated.category,
                startTime: new Date(updated.startTime).toISOString(),
                endTime: new Date(updated.endTime).toISOString(),
                notes: updated.notes ?? null,
                totalAmount: Number(updated.totalAmount),
                status: updated.status,
              }
            : b,
        ),
      );
      setEditing(false);
      router.refresh();
    });
  }



  return (
    <>
      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search by name, booker, phone, facility..."
              className="input w-full pl-9 pr-3 py-2 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-1.5 text-sm shrink-0 ${showFilters ? "bg-[var(--navy)] text-white" : ""}`}
          >
            <Filter size={14} /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[var(--gold)]" />}
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn-secondary text-xs shrink-0 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-white border border-[var(--border)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Facility</label>
              <select className="input w-full text-sm" value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)}>
                <option value="">All facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Category</label>
              <select className="input w-full text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Day of Week</label>
              <select className="input w-full text-sm" value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
                <option value="">Any day</option>
                {DAYS_OF_WEEK.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1">From Date</label>
              <input type="date" className="input w-full text-sm" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1">To Date</label>
              <input type="date" className="input w-full text-sm" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <p className="text-xs text-[var(--muted)]">
            Showing {filtered.length} of {bookings.length} bookings
          </p>
        )}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-[var(--muted)]">
            {hasActiveFilters ? "No bookings match your filters." : "No bookings found."}
          </div>
        ) : (
          filtered.map((b) => (
            <button
              key={b.id}
              type="button"
              className="card block w-full text-left hover:shadow-md transition-shadow"
              style={{ padding: "12px 16px" }}
              onClick={() => openModal(b)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--navy)] text-sm truncate">{b.title}</span>
                    <StatusBadge status={b.status} size="xs" />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                    <span>{b.bookerName || "-"}</span>
                    {b.bookerPhone && (
                      <span className="inline-flex items-center gap-2">
                        <a
                          href={`tel:${normalizeTel(b.bookerPhone)}`}
                          className="inline-flex items-center gap-1 text-[var(--navy)] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={12} /> Call
                        </a>
                        <a
                          href={`https://wa.me/${normalizeWhatsApp(b.bookerPhone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-green-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      </span>
                    )}
                    <span>•</span>
                    <span>{b.facilityName}</span>
                    <span>•</span>
                    <span>{formatDateTime(new Date(b.startTime))}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-[var(--gold)] text-sm">{formatCurrency(b.totalAmount)}</span>
                  <span className="text-xs text-[var(--muted)]">Open</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--navy)]">{selected.title}</h2>
                <p className="text-xs text-[var(--muted)] mt-1">{selected.facilityName} • {labelForCategory(selected.category, categories)}</p>
              </div>
              <button type="button" className="btn-secondary text-xs" onClick={closeModal}>Close</button>
            </div>

            <div className="p-5 space-y-4">
              {error && <div className="alert alert-error">{error}</div>}

              {!editing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="card p-3">
                      <p className="text-xs text-[var(--muted)] mb-1.5">Status</p>
                      <StatusBadge status={selected.status} size="sm" />
                    </div>
                    <div className="card p-3">
                      <p className="text-xs text-[var(--muted)]">Amount</p>
                      <p className="font-semibold text-[var(--gold)]">{formatCurrency(selected.totalAmount)}</p>
                    </div>
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
                          className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                        >
                          <MessageCircle size={12} /> WhatsApp Booker
                        </a>
                      </div>
                    )}
                    <p><strong>Start:</strong> {formatDateTime(new Date(selected.startTime))}</p>
                    <p><strong>End:</strong> {formatDateTime(new Date(selected.endTime))}</p>
                    <p><strong>Duration:</strong> {durationHours(new Date(selected.startTime), new Date(selected.endTime))} hours</p>
                    {selected.description && <p className="mt-2"><strong>Description:</strong> {selected.description}</p>}
                    {selected.notes && <p className="mt-2"><strong>Notes:</strong> {selected.notes}</p>}
                    {selected.rejectionReason && <p className="mt-2 text-red-700"><strong>Rejection:</strong> {selected.rejectionReason}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                    {canManage && (selected.status === "PENDING" || isSuperAdmin) && <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>}
                    {canManage && selected.status === "PENDING" && <BookingActions bookingId={selected.id} />}
                    {canManage && selected.status === "APPROVED" && <CompleteBookingButton bookingId={selected.id} />}
                    {canManage && ["PENDING", "APPROVED"].includes(selected.status) && <CancelBookingButton bookingId={selected.id} />}
                    {canManage && selected.bookerPhone && (
                      <SendSMSButton
                        bookingId={selected.id}
                        bookingTitle={selected.title}
                        bookerName={selected.bookerName}
                        bookerPhone={selected.bookerPhone}
                      />
                    )}

                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Facility</label>
                      <select className="input" value={form.facilityId} onChange={(e) => {
                          const fid = e.target.value;
                          const fac = facilities.find((f) => f.id === fid) ?? null;
                          const cats = fac ? categories.filter((c) => fac.categories.includes(c.slug)) : categories;
                          setForm((f) => ({ ...f, facilityId: fid, category: cats.length === 1 ? cats[0].slug : "" }));
                        }}>
                        <option value="">Select facility...</option>
                        {facilities.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Category</label>
                      <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                        <option value="">Select category...</option>
                        {formCategories.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Title</label>
                      <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Start</label>
                      <input type="datetime-local" className="input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1">End</label>
                      <input type="datetime-local" className="input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Description</label>
                      <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Notes</label>
                      <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                    <button type="button" className="btn-primary" disabled={isPending} onClick={saveEdit}>Save Changes</button>
                    <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
