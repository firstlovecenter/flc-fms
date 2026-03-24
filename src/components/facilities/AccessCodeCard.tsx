"use client";

import { useState, useTransition } from "react";
import { KeyRound, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { updateAccessCode } from "@/actions/facility.actions";

interface Props {
  facilityId: string;
  hasAccessCode: boolean;
  accessCode: string | null;
  canEdit: boolean;
}

export default function AccessCodeCard({ facilityId, hasAccessCode, accessCode, canEdit }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newCode, setNewCode] = useState(accessCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!newCode.trim()) {
      setError("Access code cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateAccessCode(facilityId, {
        hasAccessCode: true,
        accessCode: newCode.trim(),
      });
      if ("error" in result && result.error) {
        setError(result.error as string);
      } else {
        setEditing(false);
      }
    });
  }

  const masked = accessCode ? "•".repeat(accessCode.length) : "Not set";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide flex items-center gap-2">
          <KeyRound size={14} className="text-[var(--gold)]" />
          Access Code
        </h3>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--muted)] transition-colors"
              title={revealed ? "Hide code" : "Show code"}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {canEdit && !editing && (
            <button
              type="button"
              onClick={() => { setEditing(true); setNewCode(accessCode ?? ""); setError(null); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--muted)] transition-colors"
              title="Edit access code"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-xs mb-3">{error}</div>
      )}

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="input flex-1"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Enter new access code"
            autoFocus
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
            title="Save"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(null); }}
            className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-semibold text-[var(--navy)] tracking-widest">
            {revealed ? (accessCode || "Not set") : masked}
          </span>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-[var(--muted)] mt-2">Contact a Facility Manager to change the access code.</p>
      )}
    </div>
  );
}
