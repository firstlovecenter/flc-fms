"use client";

import { useState, useTransition } from "react";
import { KeyRound, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { updateAccessCode } from "@/actions/facility.actions";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Props {
  facilityId: string;
  hasAccessCode: boolean;
  accessCode: string | null;
  canEdit: boolean;
}

export default function AccessCodeCard({ facilityId, hasAccessCode, accessCode, canEdit }: Props) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newCode, setNewCode] = useState(accessCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(hasAccessCode);

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
        setEnabled(true);
        setEditing(false);
        router.refresh();
      }
    });
  }

  function handleToggle() {
    if (enabled) {
      // Disable access code
      startTransition(async () => {
        const result = await updateAccessCode(facilityId, {
          hasAccessCode: false,
          accessCode: null,
        });
        if ("error" in result && result.error) {
          setError(result.error as string);
        } else {
          setEnabled(false);
          setEditing(false);
          setRevealed(false);
          router.refresh();
        }
      });
    } else {
      // Enable — go straight into edit mode
      setEnabled(true);
      setEditing(true);
      setNewCode("");
      setError(null);
    }
  }

  const masked = accessCode ? "•".repeat(accessCode.length) : "Not set";

  // Not enabled and user can't edit — nothing to show
  if (!enabled && !canEdit) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide flex items-center gap-2">
          <KeyRound size={14} className="text-[var(--gold)]" />
          Access Code
        </h3>
        <div className="flex items-center gap-2">
          {canEdit && (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={handleToggle}
                disabled={isPending}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[var(--gold)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--gold)]" />
            </label>
          )}
          {enabled && !editing && (
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--muted)] transition-colors"
              title={revealed ? "Hide code" : "Show code"}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {canEdit && enabled && !editing && (
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
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-2 text-danger text-xs mb-3">{error}</div>
      )}

      {!enabled ? (
        <p className="text-sm text-[var(--muted)]">No access code set. Toggle on to add one.</p>
      ) : editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            className="flex-1"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Enter access code"
            autoFocus
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
            title="Save"
            aria-label="Save"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
              // If we were enabling a new code and cancelled, revert
              if (!hasAccessCode && !accessCode) setEnabled(false);
            }}
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

      {enabled && !canEdit && (
        <p className="text-xs text-[var(--muted)] mt-2">Contact a Facility Manager to change the access code.</p>
      )}
    </Card>
  );
}
