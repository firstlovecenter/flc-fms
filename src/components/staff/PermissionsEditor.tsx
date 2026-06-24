"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Save } from "lucide-react";
import { updateStaffPermissions } from "@/actions/staff.actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PERMISSION_GROUPS,
  PRESET_OPTIONS,
  type StaffPermissions,
  type StaffPermissionKey,
} from "@/lib/staff-permissions";

interface Props {
  staffId: string;
  staffName: string;
  currentPermissions: StaffPermissions;
}

export default function PermissionsEditor({ staffId, staffName, currentPermissions }: Props) {
  const router = useRouter();
  const [perms, setPerms] = useState<StaffPermissions>(currentPermissions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: StaffPermissionKey) {
    setPerms((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  function applyPreset(value: string) {
    const preset = PRESET_OPTIONS.find((p) => p.value === value);
    if (!preset) return;
    setPerms({ ...preset.permissions });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateStaffPermissions(staffId, perms);
    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  const enabledCount = Object.values(perms).filter(Boolean).length;
  const totalCount = Object.keys(perms).length;

  return (
    <div className="space-y-4">
      {/* Summary + presets */}
      <Card className="p-4 gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-[var(--slate)]">
            <Shield size={16} className="text-[var(--gold)]" />
            <span>
              <strong>{enabledCount}</strong> of <strong>{totalCount}</strong> permissions enabled for{" "}
              <strong>{staffName}</strong>
            </span>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Apply a preset
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_OPTIONS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => applyPreset(preset.value)}
                title={preset.description}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--slate)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Presets fill the toggles below as a starting point — fine-tune any individual permission afterwards.
          </p>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      {/* Permission groups */}
      {PERMISSION_GROUPS.map((group) => (
        <Card key={group.title} className="p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{group.title}</h3>
          <div className="space-y-3">
            {group.permissions.map(({ key, label, description }) => (
              <label key={key} className="group flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--navy)] group-hover:text-[var(--gold)]">{label}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={perms[key]}
                  onClick={() => toggle(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    perms[key] ? "bg-[var(--gold)]" : "bg-[var(--border-dark)]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      perms[key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving} className="gap-2">
          <Save size={16} />
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Permissions"}
        </Button>
        {saved && <p className="text-sm text-success font-medium">Changes saved.</p>}
      </div>
    </div>
  );
}
