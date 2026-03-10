"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "@/actions/event.actions";

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
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
      title="Delete event"
    >
      <Trash2 size={14} />
    </button>
  );
}
