"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";

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

export default function CeremonyBookingsTable({ bookings, canManage, isSuperAdmin }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (typeFilter === "WEDDING" && b.ceremonyType !== "wedding") return false;
    if (typeFilter === "NAMING"  && b.ceremonyType !== "naming")  return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const names = [b.title, b.bookerName, b.brideName, b.groomName, b.fatherName, b.motherName, b.childrenNames, b.ceremonyCodeValue]
        .filter(Boolean).join(" ").toLowerCase();
      if (!names.includes(q)) return false;
    }
    return true;
  });

  function typeLabel(type: CeremonyBookingRow["ceremonyType"]) {
    if (type === "wedding") return <span className="badge bg-pink-50 text-pink-700 border border-pink-200">Wedding</span>;
    if (type === "naming")  return <span className="badge bg-info/10 text-info border border-info/25">Naming</span>;
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

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--muted)]">
          <p className="text-sm">No ceremony bookings found.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-br from-[rgba(10,22,40,0.03)] to-[rgba(10,22,40,0.01)] border-b border-[var(--border)]">
                <tr>
                  {["Type", "Ceremony Date", "Venue", "Couple / Family", "Code", "Amount", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-[var(--navy)] text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                    <td className="py-3 px-4">{typeLabel(b.ceremonyType)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[var(--navy)]">{new Date(b.startTime).toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="text-xs text-[var(--muted)]">{new Date(b.startTime).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                    <td className="py-3 px-4 text-[var(--slate)]">{b.facilityName}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[var(--navy)] max-w-[200px] truncate" title={principalNames(b)}>
                        {principalNames(b)}
                      </div>
                      {b.bookerName && b.bookerName !== "—" && (
                        <div className="text-xs text-[var(--muted)]">Booked by: {b.bookerName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {b.ceremonyCodeValue ? (
                        <code className="text-xs bg-[var(--cream)] px-2 py-0.5 rounded font-mono border border-[var(--border)]">
                          {b.ceremonyCodeValue}
                        </code>
                      ) : (
                        <span className="text-[var(--muted)] text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--navy)] whitespace-nowrap">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={b.status} />
                      {b.rejectionReason && (
                        <p className="text-xs text-danger mt-0.5 max-w-[140px] truncate" title={b.rejectionReason}>
                          {b.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Link href={`/bookings/${b.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>View</Link>
                        {canManage && b.status === "PENDING" && (
                          <BookingActions bookingId={b.id} />
                        )}
                        {b.status === "APPROVED" && canManage && (
                          <CompleteBookingButton bookingId={b.id} />
                        )}
                        {canManage && ["PENDING", "APPROVED"].includes(b.status) && (
                          <CancelBookingButton bookingId={b.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
