"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  createBishop,
  updateBishop,
  toggleBishop,
  deleteBishop,
} from "@/actions/bishop.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Bishop {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  sortOrder: number;
}

export default function BishopManager({ initialBishops }: { initialBishops: Bishop[] }) {
  const [bishops, setBishops] = useState(initialBishops);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(bishop: Bishop) {
    setEditingId(bishop.id);
    setForm({ name: bishop.name, phone: bishop.phone });
    setAdding(false);
    setError(null);
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setForm({ name: "", phone: "" });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.phone.trim()) { setError("Phone is required"); return; }
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateBishop(editingId, form)
        : await createBishop(form);
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        cancel();
        window.location.reload();
      }
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      const result = await toggleBishop(id);
      if (result.success) {
        setBishops((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
        );
      }
    });
  }

  function handleDelete(bishop: Bishop) {
    const confirmed = window.confirm(
      `Delete Bishop "${bishop.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteBishop(bishop.id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      setBishops((prev) => prev.filter((b) => b.id !== bishop.id));
      if (editingId === bishop.id) cancel();
    });
  }

  return (
    <Card className="p-6 space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {bishops.map((bishop) => (
          <div key={bishop.id} className="flex items-center justify-between py-3 px-4 bg-white border border-[var(--border)] rounded-xl">
            {editingId === bishop.id ? (
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <Input
                  className="text-sm flex-1 min-w-[140px]"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Bishop's name"
                  autoFocus
                />
                <Input
                  className="text-sm flex-1 min-w-[140px]"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone"
                />
                <button onClick={handleSave} disabled={isPending} aria-label="Save" className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20">
                  <Check size={14} />
                </button>
                <button onClick={cancel} aria-label="Cancel" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${bishop.isActive ? "text-[var(--navy)]" : "text-gray-400 line-through"}`}>
                    {bishop.name}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{bishop.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(bishop.id)}
                    disabled={isPending}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      bishop.isActive
                        ? "bg-success/10 text-success border-success/25 hover:bg-success/20"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {bishop.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => startEdit(bishop)}
                    aria-label="Edit bishop"
                    className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--navy)]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(bishop)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg hover:bg-danger/10 text-[var(--muted)] hover:text-danger disabled:opacity-50"
                    title="Delete bishop"
                    aria-label="Delete bishop"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {bishops.length === 0 && !adding && (
          <p className="text-sm text-[var(--muted)] py-4 text-center">No bishops added yet.</p>
        )}
      </div>

      {adding ? (
        <div className="flex items-center gap-3 py-3 px-4 bg-gold-pale border border-[var(--navy)] rounded-xl flex-wrap">
          <Input
            className="text-sm flex-1 min-w-[140px]"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Bishop's name"
            autoFocus
          />
          <Input
            className="text-sm flex-1 min-w-[140px]"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Phone"
          />
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Add"}
          </Button>
          <Button variant="outline" onClick={cancel}>Cancel</Button>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="flex items-center gap-2 text-sm text-[var(--navy)] hover:text-[var(--gold)] transition-colors py-1"
        >
          <Plus size={15} /> Add Bishop
        </button>
      )}
    </Card>
  );
}
