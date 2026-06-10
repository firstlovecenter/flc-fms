"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  createBookingCategory,
  updateBookingCategory,
  toggleBookingCategory,
  deleteBookingCategory,
} from "@/actions/category.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

export default function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({ name: cat.name });
    setAdding(false);
    setError(null);
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setForm({ name: "" });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateBookingCategory(editingId, form)
        : await createBookingCategory(form);
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
      const result = await toggleBookingCategory(id);
      if (result.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
        );
      }
    });
  }

  function handleDelete(cat: Category) {
    const confirmed = window.confirm(
      `Delete category \"${cat.name}\"? This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteBookingCategory(cat.id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      if (editingId === cat.id) cancel();
    });
  }

  return (
    <Card className="p-6 space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between py-3 px-4 bg-white border border-[var(--border)] rounded-xl">
            {editingId === cat.id ? (
              <div className="flex items-center gap-3 flex-1">
                <Input
                  className="text-sm flex-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Category name"
                  autoFocus
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
                  <span className={`text-sm font-medium ${cat.isActive ? "text-[var(--navy)]" : "text-gray-400 line-through"}`}>
                    {cat.name}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{cat.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(cat.id)}
                    disabled={isPending}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      cat.isActive
                        ? "bg-success/10 text-success border-success/25 hover:bg-success/20"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {cat.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => startEdit(cat)}
                    aria-label="Edit category"
                    className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--navy)]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg hover:bg-danger/10 text-[var(--muted)] hover:text-danger disabled:opacity-50"
                    title="Delete category"
                    aria-label="Delete category"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex items-center gap-3 py-3 px-4 bg-gold-pale border border-[var(--navy)] rounded-xl">
          <Input
            className="text-sm flex-1"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="New category name"
            autoFocus
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
          <Plus size={15} /> Add Category
        </button>
      )}
    </Card>
  );
}
