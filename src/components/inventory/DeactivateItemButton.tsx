"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteInventoryItem } from "@/actions/inventory.actions";
import { Button } from "@/components/ui/button";

export default function DeactivateItemButton({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDeactivate() {
    setLoading(true);
    const result = await deleteInventoryItem(id);
    setLoading(false);
    if ("success" in result) {
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <span className="flex gap-1">
        <Button variant="destructive" size="sm" onClick={handleDeactivate} disabled={loading}>
          {loading ? "…" : "Confirm"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
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
      title={`Deactivate ${name}`}
    >
      <Trash2 size={12} /> Deactivate
    </Button>
  );
}
