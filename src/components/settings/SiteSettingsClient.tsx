"use client";

import { useState } from "react";
import { Phone, Mail, Save } from "lucide-react";
import { updateSiteSettings, type SiteSettings } from "@/actions/site-settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function SiteSettingsClient({
  initialSettings,
  role,
}: {
  initialSettings: SiteSettings;
  role: string;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(role);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await updateSiteSettings({
      officePhone: settings.officePhone,
      officeEmail: settings.officeEmail,
    });
    setSaving(false);
    setMessage(result.success ? { type: "success", text: "Settings saved." } : { type: "error", text: "Failed to save settings." });
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--navy)] mb-1">Office Contact Information</h2>
        <p className="text-sm text-[var(--muted)]">
          Displayed on public-facing pages so visitors can reach the office.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="site-office-phone">
            <span className="flex items-center gap-1.5"><Phone size={14} /> Office Phone Number</span>
          </Label>
          <Input
            id="site-office-phone"
            type="tel"
            value={settings.officePhone}
            onChange={e => setSettings(s => ({ ...s, officePhone: e.target.value }))}
            placeholder="+233 XX XXX XXXX"
            disabled={!canEdit}
          />
          <p className="text-xs text-[var(--muted)] mt-1">Shown on public booking and ceremony pages.</p>
        </div>

        <div>
          <Label htmlFor="site-office-email">
            <span className="flex items-center gap-1.5"><Mail size={14} /> Office Email Address</span>
          </Label>
          <Input
            id="site-office-email"
            type="email"
            value={settings.officeEmail}
            onChange={e => setSettings(s => ({ ...s, officeEmail: e.target.value }))}
            placeholder="office@firstlovecenter.org"
            disabled={!canEdit}
          />
          <p className="text-xs text-[var(--muted)] mt-1">Shown on public pages and used in system notifications.</p>
        </div>

        {canEdit && (
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? "Saving…" : "Save Settings"}
          </Button>
        )}
      </form>
    </Card>
  );
}
