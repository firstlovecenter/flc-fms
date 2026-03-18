"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Check, X, Trash2, Package } from "lucide-react";
import {
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
} from "@/actions/inventory.actions";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  _count: { items: number };
}

const emptyForm = { name: "", description: "", icon: "" };

export default function InventoryCategoryManager({
  initialCategories,
  canManage,
}: {
  initialCategories: Category[];
  canManage: boolean;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [adding, setAdding]         = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description ?? "", icon: cat.icon ?? "" });
    setAdding(false);
    setError(null);
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setForm(emptyForm);
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
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || undefined,
        icon:        form.icon.trim()        || undefined,
      };
      const result = editingId
        ? await updateInventoryCategory(editingId, payload)
        : await createInventoryCategory(payload);

      if ("error" in result && result.error) {
        setError(result.error as string);
      } else if ("category" in result) {
        if (editingId) {
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingId
                ? { ...c, name: result.category.name, description: result.category.description, icon: result.category.icon }
                : c
            )
          );
        } else {
          setCategories((prev) => [...prev, { ...result.category, _count: { items: 0 } }]);
        }
        cancel();
      }
    });
  }

  function handleDelete(cat: Category) {
    if (!window.confirm(`Delete "${cat.name}"? Items in this category will become uncategorised.`)) return;
    setError(null);
    startTransition(async () => {
      await deleteInventoryCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      if (editingId === cat.id) cancel();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Category list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="card"
            style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}
          >
            {editingId === cat.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  className="input"
                  style={{ fontSize: "0.875rem" }}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Category name"
                  autoFocus
                />
                <input
                  className="input"
                  style={{ fontSize: "0.875rem" }}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                />
                <input
                  className="input"
                  style={{ fontSize: "0.875rem" }}
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="Icon name (optional)"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="btn-primary"
                    style={{ fontSize: "0.8rem", padding: "5px 14px" }}
                  >
                    {isPending ? "Saving…" : "Save"}
                  </button>
                  <button onClick={cancel} className="btn-secondary" style={{ fontSize: "0.8rem", padding: "5px 12px" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(10,22,40,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package size={18} style={{ color: "var(--navy)" }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.9rem" }}>{cat.name}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {cat._count.items} item{cat._count.items !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => startEdit(cat)}
                        disabled={isPending}
                        style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted)" }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={isPending}
                        style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", cursor: "pointer", color: "#dc2626" }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {cat.description && (
                  <p style={{ fontSize: "0.8rem", color: "var(--slate)", lineHeight: 1.4 }}>{cat.description}</p>
                )}
              </>
            )}
          </div>
        ))}

        {categories.length === 0 && !adding && (
          <div style={{ gridColumn: "1/-1", padding: "40px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.875rem" }}>
            No categories yet.
          </div>
        )}
      </div>

      {/* Add form */}
      {canManage && (
        adding ? (
          <div className="card" style={{ padding: "18px 20px", border: "1px solid var(--navy)", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.875rem" }}>New Category</p>
            <input
              className="input"
              style={{ fontSize: "0.875rem" }}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Category name *"
              autoFocus
            />
            <input
              className="input"
              style={{ fontSize: "0.875rem" }}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
            />
            <input
              className="input"
              style={{ fontSize: "0.875rem" }}
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="Icon name (optional)"
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} disabled={isPending} className="btn-primary" style={{ fontSize: "0.85rem" }}>
                {isPending ? "Saving…" : "Add Category"}
              </button>
              <button onClick={cancel} className="btn-secondary" style={{ fontSize: "0.85rem" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={startAdd}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", fontWeight: 600, color: "var(--navy)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <Plus size={15} /> Add Category
          </button>
        )
      )}
    </div>
  );
}
