import { requirePerm } from "@/lib/auth/guards";
import { getSiteSettings } from "@/actions/site-settings.actions";
import SiteSettingsClient from "@/components/settings/SiteSettingsClient";

export default async function SettingsPage() {
  const session = await requirePerm("settings:manage");
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Site Settings</h1>
        <p className="page-subtitle">Manage public-facing contact details and office information.</p>
      </div>
      <SiteSettingsClient initialSettings={settings} canEdit />
    </div>
  );
}
