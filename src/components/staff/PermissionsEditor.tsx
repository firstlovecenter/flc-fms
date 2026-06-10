"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Save, RotateCcw } from "lucide-react";
import { updateVicarPermissions } from "@/actions/staff.actions";
import { Button } from "@/components/ui/button";
import type { VicarPermissions } from "@/lib/staff-permissions";
import { Card } from "@/components/ui/card";

interface Props {
  vicarId: string;
  vicarName: string;
  currentPermissions: VicarPermissions;
  labels: Record<keyof VicarPermissions, string>;
}

const PERMISSION_GROUPS: { title: string; keys: (keyof VicarPermissions)[] }[] = [
  {
    title: "Bookings",
    keys: ["canCreateBookings", "canCancelBookings"],
  },
  {
    title: "Facilities",
    keys: ["canManageFacilities", "canCreateMaintenance"],
  },
  {
    title: "Finance",
    keys: ["canSubmitExpenses", "canViewFinancials"],
  },
  {
    title: "People & Events",
    keys: ["canViewPatrons", "canCreateEvents"],
  },
];

export default function PermissionsEditor({ vicarId, vicarName, currentPermissions, labels }: Props) {
  const router = useRouter();
  const [perms, setPerms] = useState<VicarPermissions>(currentPermissions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof VicarPermissions) {
    setPerms((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  function resetToDefaults() {
    const defaults: VicarPermissions = {
      canCreateBookings:    true,
      canCancelBookings:    false,
      canViewFinancials:    false,
      canSubmitExpenses:    true,
      canCreateMaintenance: true,
      canManageFacilities:  false,
      canViewPatrons:       true,
      canCreateEvents:      false,
    };
    setPerms(defaults);
    setSaved(false);
  }

  function enableAll() {
    const all = Object.fromEntries(
      Object.keys(perms).map((k) => [k, true])
    ) as unknown as VicarPermissions;
    setPerms(all);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateVicarPermissions(vicarId, perms);
    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  const enabledCount = Object.values(perms).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--slate)]">
          <Shield size={16} className="text-[var(--gold)]" />
          <span>
            <strong>{enabledCount}</strong> of <strong>{Object.keys(perms).length}</strong> permissions enabled
            for <strong>{vicarName}</strong>
          </span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetToDefaults} className="gap-1">
            <RotateCcw size={12} /> Defaults
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={enableAll}>Enable All</Button>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Permission groups */}
      {PERMISSION_GROUPS.map((group) => (
        <Card key={group.title} className="p-5">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-4">{group.title}</h3>
          <div className="space-y-3">
            {group.keys.map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-4 cursor-pointer group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-[var(--navy)]">
                    {labels[key]}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {PERMISSION_DESCRIPTIONS[key]}
                  </p>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={perms[key]}
                  onClick={() => toggle(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                    perms[key] ? "bg-[var(--navy)]" : "bg-gray-200"
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

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          <Save size={16} />
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Permissions"}
        </Button>
        {saved && (
          <p className="text-sm text-green-600 font-medium">Changes saved successfully.</p>
        )}
      </div>
    </div>
  );
}

const PERMISSION_DESCRIPTIONS: Record<keyof VicarPermissions, string> = {
  canCreateBookings:    "Allow this vicar to create new facility bookings on behalf of the church.",
  canCancelBookings:    "Allow this vicar to cancel existing bookings.",
  canViewFinancials:    "Allow this vicar to view income and expense summaries.",
  canSubmitExpenses:    "Allow this vicar to submit expense requests for FM approval.",
  canCreateMaintenance: "Allow this vicar to log maintenance requests for facilities.",
  canManageFacilities:  "Allow this vicar to edit facility details and toggle maintenance locks.",
  canViewPatrons:       "Allow this vicar to view patron profiles and booking history.",
  canCreateEvents:      "Allow this vicar to create and manage campus events.",
};
