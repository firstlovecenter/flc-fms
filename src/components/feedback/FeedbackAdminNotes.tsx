"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateFacilityFeedback } from "@/actions/feedback.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function FeedbackAdminNotes({
  feedbackId,
  initialNotes,
  canManage,
}: {
  feedbackId: string;
  initialNotes: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    const result = await updateFacilityFeedback(feedbackId, { adminNotes: notes });
    setLoading(false);
    if (!("error" in result)) {
      setSaved(true);
      router.refresh();
    }
  }

  if (!canManage) {
    return initialNotes ? (
      <p className="text-sm text-[var(--slate)] whitespace-pre-wrap leading-relaxed">{initialNotes}</p>
    ) : (
      <p className="text-sm text-[var(--muted)]">No internal notes yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="admin-notes">Internal notes (staff only)</Label>
        <Textarea
          id="admin-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Notes for the team — not visible to the submitter"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save notes"}
        </Button>
        {saved && <span className="text-xs text-success font-medium">Saved</span>}
      </div>
    </div>
  );
}
