"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBookableItem, deleteBookableBundle } from "@/actions/bookable-items.actions";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? "…" : "Confirm"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setConfirming(true)}
      className="gap-1"
      title={`Delete ${name}`}
    >
      <Trash2 size={12} /> Delete
    </Button>
  );
}
