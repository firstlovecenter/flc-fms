import { requirePerm } from "@/lib/auth/guards";
import { getSiteSettings } from "@/actions/site-settings.actions";
import SiteSettingsClient from "@/components/settings/SiteSettingsClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function SettingsPage() {
  const session = await requirePerm("settings:manage");
  const settings = await getSiteSettings();

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Site settings"
        description="The office contact details shown to visitors on the public site and in notifications."
        className="mb-0"
      />
      <SiteSettingsClient initialSettings={settings} canEdit />
    </div>
  );
}
