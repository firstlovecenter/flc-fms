import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, CheckCircle2, MapPin, Package, Layers, Heart, Bird } from "lucide-react";
import PublicSplitShell from "@/components/public/PublicSplitShell";
import FacilityCatalogClient from "@/components/public/FacilityCatalogClient";
import ItemsCatalogClient from "@/components/public/ItemsCatalogClient";
import CatalogTabs from "@/components/public/CatalogTabs";
import { getSiteSettings } from "@/actions/site-settings.actions";

type Tab = "venues" | "items" | "packages";

export default async function PublicHomePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab: Tab =
    searchParams.tab === "items" ? "items"
    : searchParams.tab === "packages" ? "packages"
    : "venues";

  // ── Facilities ──────────────────────────────────────────────────────────────
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

  // ── Bookable items ───────────────────────────────────────────────────────────
  const rawItems = await prisma.bookableItem.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const items = rawItems.map(i => ({ ...i, pricePerUnit: i.pricePerUnit.toString() }));

  // ── Bundles ──────────────────────────────────────────────────────────────────
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

  // ── Site settings ────────────────────────────────────────────────────────────
  const siteSettings = await getSiteSettings();

  // ── Hero subtitle ─────────────────────────────────────────────────────────────
  const minRate = facilities.length > 0
    ? formatCurrency(Math.min(...facilities.map(f => Number(f.pricePerHour))))
    : formatCurrency(0);
  const maxCapacity = facilities.length > 0
    ? Math.max(...facilities.map(f => f.capacity)).toLocaleString()
    : "0";

  return (
    <PublicSplitShell
      key="home-shell"
      current="home"
      eyebrow="Venues, Items & Packages"
      title="Everything you need for your perfect event"
      officePhone={siteSettings.officePhone || undefined}
      officeEmail={siteSettings.officeEmail || undefined}
      subtitle={
        <>
          {facilities.length} premium {facilities.length === 1 ? "venue" : "venues"} •{" "}
          {items.length} bookable {items.length === 1 ? "item" : "items"} •{" "}
          {bundles.length} curated {bundles.length === 1 ? "package" : "packages"} — starting at {minRate.replace(".00", "")}
        </>
      }
    >
      {/* Tab navigation */}
      <div className="animate-fade-in" />
      <CatalogTabs
        active={tab}
        counts={{ venues: facilities.length, items: items.length, packages: bundles.length }}
      />

      {/* General-booking notice + ceremony catalog links */}
      <div className="mt-4 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 min-w-0">
        <p className="text-sm text-amber-800 dark:text-amber-300 min-w-0 break-words">
          <span className="font-semibold">General bookings only.</span>{" "}
          For wedding or naming ceremony bookings, visit the dedicated ceremony catalogs.
        </p>
        <div className="flex gap-2 shrink-0">
          <Link href="/catalog/weddings" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60 whitespace-nowrap transition-colors min-h-[36px]">
            <Heart size={12} /> Weddings
          </Link>
          <Link href="/catalog/namings" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60 whitespace-nowrap transition-colors min-h-[36px]">
            <Bird size={12} /> Namings
          </Link>
        </div>
      </div>

      {/* Tab: Venues */}
      {tab === "venues" && (
        <>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--navy)] mb-1">Venues & Halls</h2>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" /> Verified venues • Capacity up to {maxCapacity} guests
              </p>
            </div>
          </div>
          {facilities.length === 0 ? (
            <EmptyState icon={<MapPin size={32} className="text-[var(--gold)]" />} title="No venues available yet" />
          ) : (
            <FacilityCatalogClient facilities={facilities} />
          )}
        </>
      )}

      {/* Tab: Single Items */}
      {tab === "items" && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-[var(--navy)] mb-1">Individual Items</h2>
            <p className="text-sm text-slate-500">
              Rent chairs, tables, tents, audio equipment and more — individually, for any external event.
            </p>
          </div>
          {items.length === 0 ? (
            <EmptyState icon={<Package size={32} className="text-[var(--gold)]" />} title="No items listed yet" />
          ) : (
            <ItemsCatalogClient items={items} bundles={[]} mode="items" />
          )}
        </>
      )}

      {/* Tab: Packages / Bundles */}
      {tab === "packages" && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-[var(--navy)] mb-1">Packages & Bouquets</h2>
            <p className="text-sm text-slate-500">
              Curated bundles — everything you need for a specific event type, at one flat price.
            </p>
          </div>
          {bundles.length === 0 ? (
            <EmptyState icon={<Layers size={32} className="text-[var(--gold)]" />} title="No packages listed yet" />
          ) : (
            <ItemsCatalogClient items={[]} bundles={bundles} mode="packages" />
          )}
        </>
      )}

      {/* CTA */}
      <section className="relative mt-20 p-6 sm:p-10 md:p-14 bg-[var(--navy)] dark:bg-[#0f1b30] rounded-3xl overflow-hidden group border border-transparent dark:border-slate-700/60">
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] bg-[length:4px_4px]" aria-hidden="true" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[var(--navy-light)] to-transparent dark:from-[#1d3358] skew-x-12 translate-x-32 group-hover:translate-x-10 transition-transform duration-1000 ease-out" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left max-w-xl">
            <span className="text-[var(--gold)] text-xs font-bold uppercase tracking-widest block mb-3">Ready to Book?</span>
            <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Start your reservation in minutes
            </h3>
            <p className="text-slate-300 dark:text-slate-300/90">
              Book venues, items or packages as a guest, or create a patron account for faster checkout and booking history.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <Link href="/guest/book" className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-4 text-base">
              Guest Booking <ArrowRight size={18} />
            </Link>
            <Link href="/faq" className="page-hero-btn inline-flex items-center justify-center px-8 py-4 text-base">
              FAQs
            </Link>
            <Link href="/patron/register" className="page-hero-btn inline-flex items-center justify-center px-8 py-4 text-base">
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </PublicSplitShell>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="empty-state card border-dashed mt-4 py-20">
      <div className="w-20 h-20 rounded-full bg-[var(--gold)]/10 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>Check back soon — our team is adding more options.</p>
    </div>
  );
}
