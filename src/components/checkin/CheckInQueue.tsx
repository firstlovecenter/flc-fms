"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LogIn,
  LogOut,
  Clock,
  Building2,
  User,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  Phone,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { performCheckIn, performCheckOut, getInventoryRequirements } from "@/actions/checkin.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Booking = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  checkInRequested: boolean;
  checkInRequestedAt: Date | null;
  facility: { id: string; name: string } | null;
  patron: { id: string; name: string; phone: string | null; email: string } | null;
  user: { id: string; name: string; phone: string | null; email: string } | null;
  checkIn: {
    id: string;
    checkedInAt: Date;
    checkedOutAt: Date | null;
    notes: string | null;
    checkedInBy: { name: string };
    checkedOutBy: { name: string } | null;
  } | null;
};

type InventoryReq = {
  id: string;
  quantity: number;
  isRequired: boolean;
  notes: string | null;
  item: {
    id: string;
    name: string;
    status: string;
    quantity: number;
    condition: string;
  };
};

export default function CheckInQueue({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inventoryCache, setInventoryCache] = useState<Record<string, InventoryReq[]>>({});
  const [loadingInventory, setLoadingInventory] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pending = bookings.filter((b) => !b.checkIn);
  const checkedIn = bookings.filter((b) => b.checkIn && !b.checkIn.checkedOutAt);
  const checkedOut = bookings.filter((b) => b.checkIn?.checkedOutAt);

  async function loadInventory(facilityId: string) {
    if (inventoryCache[facilityId]) return;
    setLoadingInventory(facilityId);
    const reqs = await getInventoryRequirements(facilityId);
    setInventoryCache((prev) => ({ ...prev, [facilityId]: reqs }));
    setLoadingInventory(null);
  }

  function toggleExpand(bookingId: string, facilityId?: string | null) {
    if (expandedId === bookingId) {
      setExpandedId(null);
    } else {
      setExpandedId(bookingId);
      if (facilityId) loadInventory(facilityId);
    }
  }

  async function handleCheckIn(bookingId: string) {
    if (!confirm("Confirm check-in for this booking?")) return;
    setActionLoading(bookingId);
    const result = await performCheckIn({ bookingId, notes: notes[bookingId] });
    setActionLoading(null);
    if (result && "error" in result) {
      const msg =
        typeof result.error === "string"
          ? result.error
          : "unavailableItems" in result
            ? `${result.error}\n\n${(result as { unavailableItems: string[] }).unavailableItems.join("\n")}`
            : "Check-in failed.";
      alert(msg);
      return;
    }
    setNotes((prev) => ({ ...prev, [bookingId]: "" }));
    setExpandedId(null);
    startTransition(() => router.refresh());
  }

  async function handleCheckOut(bookingId: string) {
    if (!confirm("Confirm check-out for this booking?")) return;
    setActionLoading(bookingId);
    const result = await performCheckOut({ bookingId, notes: notes[bookingId] });
    setActionLoading(null);
    if (result && "error" in result) {
      alert(typeof result.error === "string" ? result.error : "Check-out failed.");
      return;
    }
    setNotes((prev) => ({ ...prev, [bookingId]: "" }));
    setExpandedId(null);
    startTransition(() => router.refresh());
  }

  function BookingCard({ booking, mode }: { booking: Booking; mode: "pending" | "checked-in" | "checked-out" }) {
    const contact = booking.patron ?? booking.user;
    const isExpanded = expandedId === booking.id;
    const isLoading = actionLoading === booking.id;
    const invReqs = booking.facility ? inventoryCache[booking.facility.id] : undefined;

    return (
      <Card
        className={cn(
          "border transition-all duration-150",
          booking.checkInRequested && mode === "pending"
            ? "border-warning/40 bg-warning/10"
            : "border-gray-100"
        )}
      >
        {/* Header row */}
        <button
          type="button"
          onClick={() => toggleExpand(booking.id, booking.facility?.id)}
          className="w-full flex items-start gap-3 p-4 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--navy)] text-sm truncate">{booking.title}</span>
              {booking.checkInRequested && mode === "pending" && (
                <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold bg-warning/10 text-warning border border-warning/25 px-2 py-0.5 rounded-full">
                  <Clock size={10} /> Requested
                </span>
              )}
              {mode === "checked-in" && (
                <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold bg-success/10 text-success border border-success/25 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} /> Checked In
                </span>
              )}
              {mode === "checked-out" && (
                <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold bg-foreground/5 text-muted-foreground border border-foreground/10 px-2 py-0.5 rounded-full">
                  <LogOut size={10} /> Checked Out
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
              {booking.facility && (
                <span className="flex items-center gap-1">
                  <Building2 size={11} /> {booking.facility.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {contact && (
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--slate)]">
                <User size={11} />
                <span>{contact.name}</span>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[var(--navy)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <Phone size={10} /> {contact.phone}
                  </a>
                )}
              </div>
            )}
          </div>

          <span className="text-[var(--muted)] mt-1">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {/* Expanded section */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
            {/* Inventory requirements */}
            {booking.facility && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2 flex items-center gap-1">
                  <Package size={12} /> Inventory Requirements
                </p>
                {loadingInventory === booking.facility.id ? (
                  <p className="text-xs text-[var(--muted)]">Loading…</p>
                ) : invReqs && invReqs.length > 0 ? (
                  <div className="space-y-1">
                    {invReqs.map((req) => {
                      const ok = req.item.status === "AVAILABLE" && req.item.quantity >= req.quantity;
                      return (
                        <div
                          key={req.id}
                          className={cn(
                            "flex items-center justify-between text-xs px-2 py-1.5 rounded",
                            req.isRequired && !ok ? "bg-danger/10 text-danger" : "bg-gray-50 text-gray-700"
                          )}
                        >
                          <span>
                            {req.item.name} × {req.quantity}
                            {req.isRequired ? "" : " (optional)"}
                          </span>
                          <span className={cn("font-medium", ok ? "text-success" : "text-danger")}>
                            {ok ? "✓ Available" : `⚠ ${req.item.status}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">No inventory requirements set for this facility.</p>
                )}
              </div>
            )}

            {/* Check-in info (for checked-in / checked-out) */}
            {booking.checkIn && (
              <div className="text-xs text-[var(--slate)] space-y-1">
                <p>Checked in by <strong>{booking.checkIn.checkedInBy.name}</strong> at {formatDateTime(booking.checkIn.checkedInAt)}</p>
                {booking.checkIn.checkedOutAt && booking.checkIn.checkedOutBy && (
                  <p>Checked out by <strong>{booking.checkIn.checkedOutBy.name}</strong> at {formatDateTime(booking.checkIn.checkedOutAt)}</p>
                )}
                {booking.checkIn.notes && (
                  <p className="whitespace-pre-line mt-1 text-gray-600"><strong>Notes:</strong> {booking.checkIn.notes}</p>
                )}
              </div>
            )}

            {/* Action: Check-In */}
            {mode === "pending" && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Notes (optional)…"
                  value={notes[booking.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                  className="w-full text-sm"
                  rows={2}
                />
                <Button
                  onClick={() => handleCheckIn(booking.id)}
                  disabled={isLoading || isPending}
                  className="gap-2"
                >
                  <LogIn size={14} />
                  {isLoading ? "Checking in…" : "Approve Check-In"}
                </Button>
              </div>
            )}

            {/* Action: Check-Out */}
            {mode === "checked-in" && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Check-out notes (optional)…"
                  value={notes[booking.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                  className="w-full text-sm"
                  rows={2}
                />
                <Button
                  variant="outline"
                  onClick={() => handleCheckOut(booking.id)}
                  disabled={isLoading || isPending}
                  className="gap-2"
                >
                  <LogOut size={14} />
                  {isLoading ? "Checking out…" : "Check Out"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending check-ins */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)] mb-3 flex items-center gap-2">
          <Clock size={14} />
          Awaiting Check-In
          <span className="text-xs font-normal">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--muted)] py-4">No bookings awaiting check-in today.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((b) => (
              <BookingCard key={b.id} booking={b} mode="pending" />
            ))}
          </div>
        )}
      </section>

      {/* Currently checked in */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)] mb-3 flex items-center gap-2">
          <CheckCircle2 size={14} />
          Currently Checked In
          <span className="text-xs font-normal">({checkedIn.length})</span>
        </h2>
        {checkedIn.length === 0 ? (
          <p className="text-sm text-[var(--muted)] py-4">No active check-ins.</p>
        ) : (
          <div className="space-y-2">
            {checkedIn.map((b) => (
              <BookingCard key={b.id} booking={b} mode="checked-in" />
            ))}
          </div>
        )}
      </section>

      {/* Checked out today */}
      {checkedOut.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)] mb-3 flex items-center gap-2">
            <LogOut size={14} />
            Checked Out Today
            <span className="text-xs font-normal">({checkedOut.length})</span>
          </h2>
          <div className="space-y-2">
            {checkedOut.map((b) => (
              <BookingCard key={b.id} booking={b} mode="checked-out" />
            ))}
          </div>
        </section>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle size={32} className="mx-auto text-[var(--muted)] mb-3" />
          <p className="text-[var(--muted)]">No approved bookings for today.</p>
        </div>
      )}
    </div>
  );
}
