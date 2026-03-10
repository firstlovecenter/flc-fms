"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBookableItem, deleteBookableBundle } from "@/actions/bookable-items.actions";
import { Trash2 } from "lucide-react";

export default function DeleteItemButton({
  id,
  type,
  name,
}: {
  id: string;
  type: "item" | "bundle";
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const result = type === "item"
      ? await deleteBookableItem(id)
      : await deleteBookableBundle(id);
    setLoading(false);
    if ("ok" in result) {
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <span className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2 py-1 rounded font-semibold"
          style={{ background: "#dc2626", color: "#fff" }}
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="btn-secondary text-xs px-2 py-1"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
      title={`Delete ${name}`}
    >
      <Trash2 size={12} /> Delete
    </button>
  );
}
