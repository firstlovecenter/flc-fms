"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "@/actions/event.actions";
import { Button } from "@/components/ui/button";

export default function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete event "${title}"? This cannot be undone.`)) return;
    setLoading(true);
    await deleteEvent(eventId);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-danger hover:bg-danger/10 hover:text-danger"
      title="Delete event"
      aria-label={`Delete event ${title}`}
    >
      <Trash2 size={14} />
    </Button>
  );
}
