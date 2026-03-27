"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check, RefreshCw, X, Receipt, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, Copy, CheckCheck, RotateCcw,
} from "lucide-react";
import {
  activateCeremonyCode,
  resendCeremonyCode,
  revokeCeremonyCode,
  staffCreateCeremonyCode,
  updateCeremonyCode,
  deleteCeremonyCode,
  regenerateCeremonyCode,
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

type FormState = {
  name: string;
  phone: string;
  email: string;
  ceremonyType: "WEDDING" | "NAMING";
  notes: string;
};

const EMPTY_FORM: FormState = { name: "", phone: "", email: "", ceremonyType: "WEDDING", notes: "" };

const STATUS_TABS = ["ALL", "PENDING", "ACTIVE", "USED", "EXPIRED"] as const;

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE:  "bg-green-100 text-green-700",
  USED:    "bg-blue-100 text-blue-700",
  EXPIRED: "bg-gray-100 text-gray-500",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

// ── Inline modal shell ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--navy)]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Code form (shared by create + edit) ──────────────────────────────────────
function CodeForm({
  initial,
  onSubmit,
  loading,
  error,
  submitLabel,
}: {
  initial: FormState;
  onSubmit: (f: FormState) => void;
  loading: boolean;
  error: string | null;
  submitLabel: string;
}) {
  const [f, setF] = useState(initial);
  function set(k: keyof FormState, v: string) { setF((p) => ({ ...p, [k]: v })); }

  return (
    <div className="space-y-3">
      <div>
        <label className="label text-xs">Ceremony Type</label>
        <select value={f.ceremonyType} onChange={(e) => set("ceremonyType", e.target.value as "WEDDING" | "NAMING")} className="input text-sm">
          <option value="WEDDING">Wedding</option>
          <option value="NAMING">Naming Ceremony</option>
        </select>
      </div>
      <div>
        <label className="label text-xs">Full Name *</label>
        <input value={f.name} onChange={(e) => set("name", e.target.value)} className="input text-sm" placeholder="Requester's full name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Phone *</label>
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} className="input text-sm" placeholder="0244000000" />
        </div>
        <div>
          <label className="label text-xs">Email *</label>
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className="input text-sm" placeholder="email@example.com" />
        </div>
      </div>
      <div>
        <label className="label text-xs">Notes (optional)</label>
        <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} className="input text-sm" rows={2} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={() => onSubmit(f)}
        disabled={loading || !f.name.trim() || !f.phone.trim() || !f.email.trim()}
        className="btn-primary w-full text-sm disabled:opacity-50"
      >
        {loading ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} title="Copy code" className="ml-1 p-0.5 rounded hover:bg-gray-100 text-[var(--muted)] hover:text-[var(--navy)]">
      {copied ? <CheckCheck size={12} className="text-green-600" /> : <Copy size={12} />}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CeremonyCodesClient({ initialCodes, total }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Code | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Code | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function refresh() { startTransition(() => router.refresh()); }

  const filtered = (initialCodes).filter((c) => {
    if (activeTab !== "ALL" && c.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.requesterName.toLowerCase().includes(q) ||
        c.requesterEmail.toLowerCase().includes(q) ||
        c.requesterPhone.includes(q) ||
        c.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function doRegenerate(codeId: string) {
    if (!confirm("Generate a new code string for this record? The old code will stop working immediately.")) return;
    setActionLoading(codeId + "regen");
    setGlobalError(null);
    try {
      const result = await regenerateCeremonyCode(codeId);
      if ("error" in result) setGlobalError(result.error as string);
      else refresh();
    } catch { setGlobalError("Regenerate failed. Please try again."); }
    finally { setActionLoading(null); }
  }

  async function doAction(codeId: string, action: "activate" | "resend" | "revoke") {
    setActionLoading(codeId + action);
    setGlobalError(null);
    try {
      const fn = action === "activate" ? activateCeremonyCode : action === "resend" ? resendCeremonyCode : revokeCeremonyCode;
      const result = await fn(codeId);
      if ("error" in result) setGlobalError(result.error as string);
      else refresh();
    } catch { setGlobalError("Action failed. Please try again."); }
    finally { setActionLoading(null); }
  }

  async function handleCreate(f: FormState) {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const result = await staffCreateCeremonyCode({ ...f, notes: f.notes || undefined });
      if ("error" in result) { setCreateError(result.error as string); }
      else { setShowCreate(false); refresh(); }
    } catch { setCreateError("Failed to create code."); }
    finally { setCreateLoading(false); }
  }

  async function handleEdit(f: FormState) {
    if (!editTarget) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const result = await updateCeremonyCode(editTarget.id, { ...f, notes: f.notes || undefined });
      if ("error" in result) { setEditError(result.error as string); }
      else { setEditTarget(null); refresh(); }
    } catch { setEditError("Failed to update code."); }
    finally { setEditLoading(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const result = await deleteCeremonyCode(deleteTarget.id);
      if ("error" in result) { setGlobalError(result.error as string); }
      else { setDeleteTarget(null); refresh(); }
    } catch { setGlobalError("Failed to delete code."); }
    finally { setDeleteLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === t ? "bg-[var(--navy)] text-white" : "bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, code…"
            className="input text-sm flex-1 min-w-0"
          />
          <button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="btn-primary text-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={14} /> New Code
          </button>
        </div>
      </div>

      {globalError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide w-5"></th>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)] text-sm">
                    No codes found.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <>
                  <tr key={c.id} className="hover:bg-gray-50">
                    {/* Expand toggle */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleExpand(c.id)}
                        className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--navy)]"
                        title={expanded.has(c.id) ? "Collapse" : "Expand"}
                      >
                        {expanded.has(c.id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </td>
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
                      {fmt(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-[var(--muted)]">
                      {c.expiresAt ? fmt(c.expiresAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Receipt */}
                        {c.receiptUrl && (
                          <a href={c.receiptUrl} target="_blank" rel="noopener noreferrer" title="View receipt"
                            className="p-1.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100">
                            <Receipt size={13} />
                          </a>
                        )}
                        {/* Edit — not for USED */}
                        {c.status !== "USED" && (
                          <button
                            onClick={() => { setEditTarget(c); setEditError(null); }}
                            title="Edit details"
                            className="p-1.5 rounded bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {/* Regenerate code — PENDING or ACTIVE */}
                        {(c.status === "PENDING" || c.status === "ACTIVE") && (
                          <button
                            onClick={() => doRegenerate(c.id)}
                            disabled={actionLoading === c.id + "regen"}
                            title="Regenerate code"
                            className="p-1.5 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-50"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        {/* Status actions */}
                        {c.status === "PENDING" && (
                          <button onClick={() => doAction(c.id, "activate")} disabled={actionLoading === c.id + "activate"}
                            title="Activate" className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
                            <Check size={13} />
                          </button>
                        )}
                        {c.status === "ACTIVE" && (
                          <>
                            <button onClick={() => doAction(c.id, "resend")} disabled={actionLoading === c.id + "resend"}
                              title="Resend" className="p-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">
                              <RefreshCw size={13} />
                            </button>
                            <button onClick={() => doAction(c.id, "revoke")} disabled={actionLoading === c.id + "revoke"}
                              title="Revoke" className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">
                              <X size={13} />
                            </button>
                          </>
                        )}
                        {c.status === "USED" && c.bookingId && (
                          <Link href={`/bookings/${c.bookingId}`}
                            className="text-xs text-[var(--gold)] hover:underline whitespace-nowrap">
                            View booking →
                          </Link>
                        )}
                        {/* Delete — not for USED */}
                        {c.status !== "USED" && (
                          <button onClick={() => setDeleteTarget(c)} title="Delete"
                            className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expanded.has(c.id) && (
                    <tr key={c.id + "-detail"} className="bg-gray-50/60">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-xs">
                          <div>
                            <span className="text-[var(--muted)] font-medium uppercase tracking-wide">Code</span>
                            <div className="flex items-center mt-0.5">
                              <span className="font-mono font-bold text-[var(--navy)] tracking-widest">{c.code}</span>
                              <CopyButton value={c.code} />
                            </div>
                          </div>
                          {c.activatedBy && (
                            <div>
                              <span className="text-[var(--muted)] font-medium uppercase tracking-wide">Activated By</span>
                              <p className="mt-0.5 text-[var(--navy)]">{c.activatedBy.name}</p>
                            </div>
                          )}
                          {c.notes && (
                            <div className="sm:col-span-2 lg:col-span-1">
                              <span className="text-[var(--muted)] font-medium uppercase tracking-wide">Notes</span>
                              <p className="mt-0.5 text-[var(--slate)] whitespace-pre-wrap">{c.notes}</p>
                            </div>
                          )}
                          {c.receiptUrl && (
                            <div>
                              <span className="text-[var(--muted)] font-medium uppercase tracking-wide">Receipt</span>
                              <div className="mt-0.5">
                                <a href={c.receiptUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-[var(--gold)] hover:underline">View payment receipt →</a>
                              </div>
                            </div>
                          )}
                          {c.expiresAt && (
                            <div>
                              <span className="text-[var(--muted)] font-medium uppercase tracking-wide">Expires</span>
                              <p className="mt-0.5 text-[var(--navy)]">{fmt(c.expiresAt)}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)] text-right">
        {filtered.length} of {total} total
      </p>

      {/* Create modal */}
      {showCreate && (
        <Modal title="New Ceremony Code" onClose={() => setShowCreate(false)}>
          <CodeForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            loading={createLoading}
            error={createError}
            submitLabel="Create Code"
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title="Edit Code Details" onClose={() => setEditTarget(null)}>
          <CodeForm
            initial={{
              name: editTarget.requesterName,
              phone: editTarget.requesterPhone,
              email: editTarget.requesterEmail,
              ceremonyType: editTarget.ceremonyType as "WEDDING" | "NAMING",
              notes: editTarget.notes ?? "",
            }}
            onSubmit={handleEdit}
            loading={editLoading}
            error={editError}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <Modal title="Delete Code" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--slate)]">
            Are you sure you want to delete the code for{" "}
            <strong>{deleteTarget.requesterName}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="btn-primary bg-red-600 hover:bg-red-700 text-sm flex-1 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
            <button onClick={() => setDeleteTarget(null)} className="flex-1 text-sm border border-[var(--border)] rounded-lg px-4 py-2 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
