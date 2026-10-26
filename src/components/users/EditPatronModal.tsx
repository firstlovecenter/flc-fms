"use client";

import { useState, useEffect } from "react";
import { useModalBehavior } from "@/hooks/use-modal-behavior";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { updatePatron } from "@/actions/patron.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Patron {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isVerified: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  patron: Patron;
}

export default function EditPatronModal({ open, onClose, patron }: Props) {
  useModalBehavior(open, onClose);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSaving(true);
    const result = await updatePatron(patron.id, {
      name:       fd.get("name") as string,
      email:      fd.get("email") as string,
      phone:      fd.get("phone") as string,
      isVerified: fd.get("isVerified") === "true",
    });
    setSaving(false);
    if ("error" in result) { setError(result.error ?? "Failed."); return; }
    router.refresh();
    onClose();
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[1.5rem] bg-card shadow-[0_24px_64px_-24px_rgb(28_25_23/0.45)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Edit Patron</h2>
          <button onClick={onClose} aria-label="Close" className="flex size-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">{error}</div>
          )}
          <div>
            <Label htmlFor="edit-patron-name">Full Name *</Label>
            <Input id="edit-patron-name" name="name" required minLength={2} defaultValue={patron.name} />
          </div>
          <div>
            <Label htmlFor="edit-patron-email">Email *</Label>
            <Input id="edit-patron-email" name="email" type="email" required defaultValue={patron.email} />
          </div>
          <div>
            <Label htmlFor="edit-patron-phone">Phone *</Label>
            <Input id="edit-patron-phone" name="phone" type="tel" required minLength={9} defaultValue={patron.phone ?? ""} placeholder="+233..." />
          </div>
          <div>
            <Label htmlFor="edit-patron-verified">Verification Status</Label>
            <select id="edit-patron-verified" name="isVerified" defaultValue={String(patron.isVerified)} className={cn(inputStyles)}>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
