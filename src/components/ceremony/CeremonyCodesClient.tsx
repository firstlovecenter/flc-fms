"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, X, Receipt } from "lucide-react";
import {
  activateCeremonyCode,
  resendCeremonyCode,
  revokeCeremonyCode,
} from "@/actions/ceremony-code.actions";

type Code = {
  id: string;
  code: string;
  status: string;
  ceremonyType: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  bookingId: string | null;
  activatedBy: { name: string } | null;
};

type Props = {
  initialCodes: Code[];
  total: number;
};

const STATUS_TABS = ["ALL", "PENDING", "ACTIVE", "USED", "EXPIRED"] as const;

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-amber-100 text-amber-700",
  ACTIVE:   "bg-green-100 text-green-700",
  USED:     "bg-blue-100 text-blue-700",
  EXPIRED:  "bg-gray-100 text-gray-500",
};

export default function CeremonyCodesClient({ initialCodes, total }: Props) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialCodes);
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = codes.filter((c) => {
    if (activeTab !== "ALL" && c.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.requesterName.toLowerCase().includes(q) ||
        c.requesterEmail.toLowerCase().includes(q) ||
        c.requesterPhone.includes(q)
      );
    }
    return true;
  });

  async function doAction(
    codeId: string,
    action: "activate" | "resend" | "revoke"
  ) {
    setActionLoading(codeId + action);
    setError(null);
    try {
      const fn =
        action === "activate"
          ? activateCeremonyCode
          : action === "resend"
            ? resendCeremonyCode
            : revokeCeremonyCode;
      const result = await fn(codeId);
      if ("error" in result) {
        setError(result.error as string);
      } else {
        startTransition(() => router.refresh());
      }
    } catch {
      setError("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === t
                  ? "bg-[var(--navy)] text-white"
                  : "bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="input text-sm flex-1"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide hidden lg:table-cell">Requested</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide hidden lg:table-cell">Expires</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)] text-sm">
                    No codes found.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--navy)]">{c.requesterName}</p>
                    <p className="text-xs text-[var(--muted)] md:hidden">{c.requesterPhone}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs">{c.requesterEmail}</p>
                    <p className="text-xs text-[var(--muted)]">{c.requesterPhone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">
                      {c.ceremonyType === "WEDDING" ? "Wedding" : "Naming"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-[var(--muted)]">
                    {new Date(c.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-[var(--muted)]">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.receiptUrl && (
                        <a
                          href={c.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View payment receipt"
                          className="p-1.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          <Receipt size={13} />
                        </a>
                      )}
                      {c.status === "PENDING" && (
                        <button
                          onClick={() => doAction(c.id, "activate")}
                          disabled={actionLoading === c.id + "activate"}
                          title="Activate"
                          className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      {c.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() => doAction(c.id, "resend")}
                            disabled={actionLoading === c.id + "resend"}
                            title="Resend"
                            className="p-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            onClick={() => doAction(c.id, "revoke")}
                            disabled={actionLoading === c.id + "revoke"}
                            title="Revoke"
                            className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                      {c.status === "USED" && c.bookingId && (
                        <Link
                          href={`/bookings/${c.bookingId}`}
                          className="text-xs text-[var(--gold)] hover:underline whitespace-nowrap"
                        >
                          View booking →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)] text-right">
        {filtered.length} of {total} total
      </p>
    </div>
  );
}
