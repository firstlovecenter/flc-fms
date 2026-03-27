"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, KeyRound, Trash2 } from "lucide-react";
import { deletePatron, resetPatronPassword } from "@/actions/patron.actions";
import EditPatronModal from "./EditPatronModal";

interface Props {
  patron: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isVerified: boolean;
  };
}

export default function PatronRowActions({ patron }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleResetPassword() {
    if (!confirm(`Reset password for ${patron.name}?`)) return;
    setLoading("reset");
    await resetPatronPassword(patron.id);
    setLoading(null);
    setResetSent(true);
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete ${patron.name}? This cannot be undone.`)) return;
    setLoading("delete");
    setDeleteError(null);
    const result = await deletePatron(patron.id);
    setLoading(null);
    if ("error" in result && result.error) {
      setDeleteError(result.error);
      setOpen(false);
      return;
    }
    router.refresh();
  }

  if (resetSent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 max-w-56">
        New temporary password sent.
        <button onClick={() => setResetSent(false)} className="text-green-700 hover:text-green-900 ml-2 font-semibold">Dismiss</button>
      </div>
    );
  }

  if (deleteError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 max-w-56">
        {deleteError}
        <button onClick={() => setDeleteError(null)} className="text-red-600 hover:text-red-800 ml-2 font-semibold">Dismiss</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--slate)]"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-[var(--border)] rounded-xl shadow-lg w-44 py-1 text-sm">
            <button
              onClick={() => { setOpen(false); setEditOpen(true); }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--cream)] text-[var(--slate)]"
            >
              <Pencil size={14} /> Edit Details
            </button>
            <button
              onClick={handleResetPassword}
              disabled={!!loading}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--cream)] text-[var(--slate)] disabled:opacity-50"
            >
              <KeyRound size={14} /> {loading === "reset" ? "Sending…" : "Reset Password"}
            </button>
            <div className="border-t border-[var(--border)] my-1" />
            <button
              onClick={handleDelete}
              disabled={!!loading}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 text-red-600 disabled:opacity-50"
            >
              <Trash2 size={14} /> {loading === "delete" ? "Deleting…" : "Delete"}
            </button>
          </div>
        </>
      )}

      <EditPatronModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patron={patron}
      />
    </div>
  );
}
