"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateTime, durationHours, cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X, CalendarDays, Pencil, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";
import SendSMSButton from "@/components/bookings/SendSMSButton";
import DeleteBookingButton from "@/components/bookings/DeleteBookingButton";
import { updateBookingByManager } from "@/actions/booking.actions";
import { RecordSheet, SheetSection, DetailGrid } from "@/components/layout/RecordSheet";
import { ContactButtons } from "@/components/bookings/booking-list-parts";
import BookingTable from "@/components/bookings/BookingTable";

type BookingItem = {
  id: string;
  title: string;
  description: string | null;
  facilityId: string | null;
  facilityName: string;
  category: string;
  status: string;
  totalAmount: number;
  acRequested: boolean;
  startTime: string;
  endTime: string;
  notes: string | null;
  rejectionReason: string | null;
  bookerName: string;
  bookerPhone: string | null;
  bookerEmail: string | null;
  createdByStaffName: string | null;
  lineItems: { label: string; unit: string | null; quantity: number; unitPrice: number; subtotal: number }[];
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

const selectClassName = cn(
  "min-h-11 w-full min-w-0 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--field-bg,var(--surface))] px-3 py-2 text-body text-[var(--field-fg,var(--navy))] transition-colors outline-none focus-visible:border-[var(--navy-mid)] focus-visible:ring-[3px] focus-visible:ring-gold/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

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

  const activeFilterCount = [filterFacility, filterCategory, filterDateFrom, filterDateTo, filterDay].filter(Boolean).length;
  const hasActiveFilters = !!searchQuery || activeFilterCount > 0;

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

  function handleDeleted() {
    if (!selectedId) return;
    setBookings((prev) => prev.filter((b) => b.id !== selectedId));
    closeModal();
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
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              type="text"
              placeholder="Search title, booker, phone, facility…"
              aria-label="Search bookings"
              className="h-10 min-h-10 !rounded-full bg-card pl-10 pr-9 text-sm shadow-[var(--shadow-xs)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--muted)] hover:text-[var(--navy)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 min-h-10 gap-1.5 bg-card shadow-[var(--shadow-xs)]"
            >
              <SlidersHorizontal size={14} /> Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[hsl(var(--btn))] text-[0.65rem] font-semibold text-[hsl(var(--btn-foreground))]">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={clearFilters} className="h-10 min-h-10 gap-1 text-[var(--muted)]">
                <X size={14} /> Clear
              </Button>
            )}
          </div>
          <p className="shrink-0 text-sm text-[var(--muted)] sm:ml-auto">
            <span className="font-medium tabular-nums text-[var(--navy)]">{filtered.length}</span>
            {hasActiveFilters ? ` of ${bookings.length}` : ""} on this page
          </p>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-[1.25rem] border border-border/70 bg-card p-4 shadow-[var(--shadow-xs)] sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Facility</Label>
              <select className={cn(selectClassName, "text-sm")} value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)}>
                <option value="">All facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Category</Label>
              <select className={cn(selectClassName, "text-sm")} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Day of week</Label>
              <select className={cn(selectClassName, "text-sm")} value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
                <option value="">Any day</option>
                {DAYS_OF_WEEK.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">From</Label>
              <Input type="date" className="w-full text-sm" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">To</Label>
              <Input type="date" className="w-full text-sm" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={hasActiveFilters ? "No matching bookings" : "No bookings here yet"}
          description={
            hasActiveFilters
              ? "Nothing on this page matches your search and filters."
              : "Bookings appear here when staff create them or patrons request a facility."
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
          onOpen={(id) => {
            const b = bookings.find((x) => x.id === id);
            if (b) openModal(b);
          }}
          rows={filtered.map((b) => ({
            id: b.id,
            title: b.title,
            subtitle: labelForCategory(b.category, categories),
            facility: b.facilityName,
            startTime: b.startTime,
            endTime: b.endTime,
            booker: b.bookerName,
            bookerNote: b.createdByStaffName ? `Booked by ${b.createdByStaffName}` : "Patron request",
            phone: b.bookerPhone,
            amount: b.totalAmount,
            status: b.status,
            ac: b.acRequested,
          }))}
        />
      )}

      {/* ── Details ──────────────────────────────────────────────────── */}
      <RecordSheet
        open={!!selected}
        onClose={closeModal}
        title={selected?.title ?? ""}
        badges={selected ? <StatusBadge status={selected.status} size="sm" /> : null}
        description={selected ? `${selected.facilityName} · ${labelForCategory(selected.category, categories)}` : undefined}
        actions={selected && !editing ? (
          <>
            {canManage && selected.status === "PENDING" && <BookingActions bookingId={selected.id} />}
            {canManage && selected.status === "APPROVED" && <CompleteBookingButton bookingId={selected.id} />}
            {canManage && (selected.status === "PENDING" || isSuperAdmin) && (
              <Button type="button" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil size={14} /> Edit
              </Button>
            )}
            {canManage && selected.bookerPhone && (
              <SendSMSButton
                bookingId={selected.id}
                bookingTitle={selected.title}
                bookerName={selected.bookerName}
                bookerPhone={selected.bookerPhone}
              />
            )}
            {canManage && ["PENDING", "APPROVED"].includes(selected.status) && <CancelBookingButton bookingId={selected.id} />}
            {isSuperAdmin && <DeleteBookingButton bookingId={selected.id} onDeleted={handleDeleted} />}
          </>
        ) : selected && editing ? (
          <>
            <Button type="button" disabled={isPending} onClick={saveEdit}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : undefined}
      >
        {selected && (
          <>
            {error && <div className="alert alert-error">{error}</div>}

            {!editing ? (
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
                      { label: "Starts", value: formatDateTime(new Date(selected.startTime)) },
                      { label: "Ends", value: formatDateTime(new Date(selected.endTime)) },
                      { label: "Duration", value: `${durationHours(new Date(selected.startTime), new Date(selected.endTime))} hours` },
                      { label: "Category", value: labelForCategory(selected.category, categories) },
                    ]}
                  />
                </SheetSection>

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

                {(selected.description || selected.notes) && (
                  <SheetSection title="Notes">
                    <DetailGrid
                      items={[
                        selected.description && { label: "Description", value: selected.description, full: true },
                        selected.notes && { label: "Notes", value: selected.notes, full: true },
                      ]}
                    />
                  </SheetSection>
                )}

                {selected.lineItems.length > 0 && (
                  <SheetSection title="Booked items">
                    <ul className="divide-y divide-border/70 rounded-2xl border border-border/70">
                      {selected.lineItems.map((li, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                          <span className="min-w-0 text-[var(--navy)]">
                            <span className="font-medium tabular-nums">{li.quantity}×</span> {li.label}
                            {li.unit ? <span className="text-[var(--muted)]"> ({li.unit})</span> : null}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums text-[var(--navy)]">{formatCurrency(li.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                  </SheetSection>
                )}

                <Link
                  href={`/bookings/${selected.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] hover:underline"
                >
                  Open full booking page <ArrowUpRight size={14} />
                </Link>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Facility</Label>
                  <select className={selectClassName} value={form.facilityId} onChange={(e) => {
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
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Category</Label>
                  <select className={selectClassName} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category...</option>
                    {formCategories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Title</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Start</Label>
                  <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">End</Label>
                  <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Description</Label>
                  <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            )}
          </>
        )}
      </RecordSheet>
    </>
  );
}
