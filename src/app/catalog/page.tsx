import { prisma } from "@/lib/db/prisma";
import { Package, Layers } from "lucide-react";
import PublicShell from "@/components/public/PublicShell";
import VisitorHero from "@/components/public/VisitorHero";
import VisitorSection from "@/components/public/VisitorSection";
import VenueCatalog from "@/components/public/VenueCatalog";
import ItemsCatalogClient from "@/components/public/ItemsCatalogClient";
import CatalogTabs from "@/components/public/CatalogTabs";
import { getCeremonyVenueConfigs } from "@/actions/ceremony-venue.actions";
import { getCeremonyVenueAvailabilitySummaries } from "@/actions/availability.actions";
import { getSiteSettings } from "@/actions/site-settings.actions";

type Tab = "venues" | "items" | "packages";

export const metadata = {
  title: "Browse the campus",
  description: "Halls, venues, items and packages available at First Love Center.",
};

export default async function CatalogPage(props: {
  searchParams: Promise<{ tab?: string; vtype?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab: Tab =
    searchParams.tab === "items" ? "items"
    : searchParams.tab === "packages" ? "packages"
    : "venues";
  const vtype: "regular" | "naming" | "wedding" =
    searchParams.vtype === "wedding" ? "wedding"
    : searchParams.vtype === "naming" ? "naming"
    : "regular";

  const rawFacilities = await prisma.facility.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, description: true,
      underMaintenance: true, maintenanceStartsAt: true, maintenanceEndsAt: true,
      capacity: true, availableFrom: true, availableTo: true,
      amenities: true, images: true, sortOrder: true,
      pricing: { select: { category: true, price: true }, where: { isActive: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const now = new Date();
  const facilities = rawFacilities
    .map(f => {
      const expired = f.underMaintenance && f.maintenanceEndsAt && new Date(f.maintenanceEndsAt) < now;
      return {
        ...f,
        underMaintenance: expired ? false : f.underMaintenance,
        pricePerHour: (f.pricing.length ? Math.min(...f.pricing.map((p) => Number(p.price))) : 0).toString(),
        supportedCategories: f.pricing.map(p => p.category as string),
        maintenanceStartsAt: f.maintenanceStartsAt?.toISOString() ?? null,
        maintenanceEndsAt: f.maintenanceEndsAt?.toISOString() ?? null,
        pricing: undefined,
      };
    })
    .sort((a, b) => (a.underMaintenance === b.underMaintenance ? 0 : a.underMaintenance ? 1 : -1));

  const rawItems = await prisma.bookableItem.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const items = rawItems.map(i => ({ ...i, pricePerUnit: i.pricePerUnit.toString() }));

  const rawBundles = await prisma.bookableBundle.findMany({
    where: { isActive: true },
    include: { components: { include: { item: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const bundles = rawBundles.map(b => ({
    ...b,
    price: b.price.toString(),
    components: b.components.map(c => ({
      ...c,
      item: { ...c.item, pricePerUnit: c.item.pricePerUnit.toString() },
    })),
  }));

  const siteSettings = await getSiteSettings();

  const [weddingConfigs, namingConfigs, weddingAvailability, namingAvailability] = await Promise.all([
    getCeremonyVenueConfigs("WEDDING"),
    getCeremonyVenueConfigs("NAMING"),
    getCeremonyVenueAvailabilitySummaries("WEDDING"),
    getCeremonyVenueAvailabilitySummaries("NAMING"),
  ]);

  const maxCapacity = facilities.length > 0
    ? Math.max(...facilities.map(f => f.capacity)).toLocaleString()
    : "0";

  const HEADINGS: Record<Tab, { title: string; description: string }> = {
    venues: {
      title: "Halls and venues",
      description: `Spaces for conferences, weddings and gatherings — seating up to ${maxCapacity} guests.`,
    },
    items: {
      title: "What you can add",
      description: "Chairs, tables, canopies and sound — add only what your gathering needs.",
    },
    packages: {
      title: "Ready-made packages",
      description: "Everything for a particular kind of gathering, at one flat price.",
    },
  };

  return (
    <PublicShell
      current="catalog"
      maxWidth="lg"
      officePhone={siteSettings.officePhone || undefined}
      officeEmail={siteSettings.officeEmail || undefined}
      hero={
        <VisitorHero
          eyebrow="What's available"
          title="Browse the campus"
          subtitle="Every hall, item and package you can add to your visit."
        />
      }
    >
      <VisitorSection
        id="catalogue"
        eyebrow="Available now"
        title={HEADINGS[tab].title}
        description={HEADINGS[tab].description}
      >
        <CatalogTabs
          active={tab}
          counts={{ venues: facilities.length, items: items.length, packages: bundles.length }}
        />

        {tab === "venues" && (
          <VenueCatalog
            facilities={facilities}
            weddingConfigs={weddingConfigs}
            namingConfigs={namingConfigs}
            weddingAvailability={weddingAvailability}
            namingAvailability={namingAvailability}
            defaultType={vtype}
            officePhone={siteSettings.officePhone || undefined}
            officeEmail={siteSettings.officeEmail || undefined}
          />
        )}

        {tab === "items" &&
          (items.length === 0 ? (
            <EmptyState
              icon={<Package size={30} className="text-[var(--gold-muted)]" />}
              title="Nothing listed just yet"
            />
          ) : (
            <ItemsCatalogClient items={items} bundles={[]} mode="items" />
          ))}

        {tab === "packages" &&
          (bundles.length === 0 ? (
            <EmptyState
              icon={<Layers size={30} className="text-[var(--gold-muted)]" />}
              title="No packages just yet"
            />
          ) : (
            <ItemsCatalogClient items={[]} bundles={bundles} mode="packages" />
          ))}
      </VisitorSection>
    </PublicShell>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--border-dark)] bg-[var(--surface)] px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--gold-hsl)/0.12)]">
        {icon}
      </div>
      <h3 className="font-display text-lg text-[var(--navy)]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--text-muted)]">
        Check back soon — we are still adding options here.
      </p>
    </div>
  );
}
