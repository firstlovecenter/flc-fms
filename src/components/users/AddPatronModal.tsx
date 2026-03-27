"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { createPatron } from "@/actions/patron.actions";

export default function AddPatronModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSaving(true);
    const result = await createPatron({
      name:  fd.get("name") as string,
      email: fd.get("email") as string,
      phone: fd.get("phone") as string,
    });
    setSaving(false);
    if ("error" in result) { setError(result.error ?? "Failed."); return; }
    setCreated(true);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setCreated(false);
    setError(null);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <UserPlus size={16} /> Add Patron
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--navy)]">Add Patron</h2>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)]">
                <X size={18} />
              </button>
            </div>

            {created ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-semibold mb-1">Patron account created!</p>
                  <p className="text-sm text-green-600">Login credentials have been sent via SMS and email.</p>
                </div>
                <button onClick={handleClose} className="btn-primary w-full">Done</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[var(--slate)] mb-1">Full Name *</label>
                  <input name="name" required minLength={2} className="input" placeholder="Ama Boateng" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--slate)] mb-1">Email *</label>
                  <input name="email" type="email" required className="input" placeholder="ama@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone *</label>
                  <input name="phone" type="tel" required minLength={9} className="input" placeholder="+233..." />
                </div>
                <p className="text-xs text-[var(--muted)]">A temporary password will be generated and sent to the patron via SMS and email.</p>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? "Creating…" : "Create Patron"}
                  </button>
                  <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
