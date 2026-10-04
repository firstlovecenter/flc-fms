import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { cn, formatCurrency } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { ArrowRight, Package, Layers, Building2 } from "lucide-react";
import PublicShell from "@/components/public/PublicShell";
import VisitorHero from "@/components/public/VisitorHero";
import VisitorSection from "@/components/public/VisitorSection";
import CategoryCard from "@/components/public/CategoryCard";
import { getSiteSettings } from "@/actions/site-settings.actions";

// Counts and imagery come from live data; without this the page would be
// prerendered at build time and the figures would freeze.
export const dynamic = "force-dynamic";

/**
 * Landing page. Marketing only — one clear next action (Book now). The
 * browsable catalogue lives at /catalog.
 */
export default async function PublicHomePage() {
  const [facilities, itemCount, bundleCount, siteSettings] = await Promise.all([
    prisma.facility.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        capacity: true,
        images: true,
        pricing: { select: { price: true }, where: { isActive: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.bookableItem.count({ where: { isActive: true } }),
    prisma.bookableBundle.count({ where: { isActive: true } }),
    getSiteSettings(),
  ]);

  const prices = facilities.flatMap(f => f.pricing.map(p => Number(p.price))).filter(p => p > 0);
  const minRate = prices.length > 0 ? formatCurrency(Math.min(...prices)).replace(".00", "") : null;
  const maxCapacity = facilities.length > 0
    ? Math.max(...facilities.map(f => f.capacity)).toLocaleString()
    : "0";
  const venueImage = facilities.find(f => f.images?.length)?.images?.[0] ?? null;
  const gallery = facilities.filter(f => f.images?.length).slice(0, 6);

  return (
    <PublicShell
      current="home"
      maxWidth="lg"
      officePhone={siteSettings.officePhone || undefined}
      officeEmail={siteSettings.officeEmail || undefined}
      hero={
        <VisitorHero
          variant="photo"
          image="/left-split-bg.jpg"
          focalPoint="50% 42%"
          eyebrow="First Love Center"
          title="Host your next conference, wedding or gathering"
          subtitle={`Halls that seat up to ${maxCapacity}, everything you need.`}
        >
          <Link
            href="/guest/book"
            className={cn(buttonVariants({ variant: "default" }), "h-12 gap-2 px-9 text-sm font-semibold uppercase tracking-[0.12em]")}
          >
            Book now <ArrowRight size={17} aria-hidden />
          </Link>
        </VisitorHero>
      }
    >
      <VisitorSection
        id="campus-services"
        eyebrow="Enjoy campus services"
        title="Browse by category"
        description="Choose a service to see what is available."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <CategoryCard
            title="Halls and venues"
            description="Spaces for conferences, weddings, namings and gatherings of every size."
            icon={Building2}
            href="/catalog?tab=venues"
            image={venueImage}
            imageAlt="A First Love Center hall set up for a gathering"
            accent="host"
            meta={`${facilities.length} ${facilities.length === 1 ? "space" : "spaces"}`}
            cta="Browse venues"
          />
          <CategoryCard
            title="Items to hire"
            description="Chairs, tables, canopies and sound equipment, hired by the piece."
            icon={Package}
            href={itemCount > 0 ? "/catalog?tab=items" : undefined}
            accent="stay"
            meta={itemCount > 0 ? `${itemCount} available` : undefined}
            cta="Browse items"
          />
          <CategoryCard
            title="Packages"
            description="Everything for a particular kind of gathering, at one flat price."
            icon={Layers}
            href={bundleCount > 0 ? "/catalog?tab=packages" : undefined}
            accent="celebrate"
            meta={bundleCount > 0 ? `${bundleCount} curated` : undefined}
            cta="Browse packages"
          />
        </div>
      </VisitorSection>

      {gallery.length > 0 && (
        <VisitorSection
          id="spaces"
          eyebrow="A look around"
          title="Our spaces"
          description="A few of the halls and venues on campus."
          meta={
            <Link
              href="/catalog?tab=venues"
              className="font-semibold text-[var(--gold-muted)] underline-offset-4 hover:underline"
            >
              See all
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {gallery.map((facility, index) => (
              <Link
                key={facility.id}
                href={`/catalog/facilities/${facility.id}`}
                // First tile runs double-width on larger screens so the grid
                // isn't a flat row of identical squares.
                className={cn(
                  "group relative block overflow-hidden rounded-[var(--r-2xl)] no-underline shadow-[var(--shadow-sm)]",
                  index === 0 && "col-span-2 md:row-span-2"
                )}
              >
                <div className={cn("relative", index === 0 ? "aspect-[4/3] md:aspect-[3/2]" : "aspect-[4/3]")}>
                  <img
                    src={facility.images[0]}
                    alt={facility.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3
                      className={cn(
                        "text-[#fff] drop-shadow",
                        index === 0 ? "text-xl sm:text-2xl" : "text-base"
                      )}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {facility.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[rgba(255,255,255,0.85)]">
                      Seats {facility.capacity.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </VisitorSection>
      )}

      <section className="mb-4 overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-col items-start gap-6 p-7 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl text-[var(--navy)] sm:text-3xl">
              Ready when you are
            </h2>
            <p className="mt-2 leading-relaxed text-[var(--text-muted)]">
              Tell us what you are planning and we will confirm the details
              {minRate ? ` — spaces start from ${minRate}.` : "."}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/guest/book"
              className={cn(buttonVariants({ variant: "default" }), "w-full gap-2 px-7 sm:w-auto")}
            >
              Book now <ArrowRight size={17} aria-hidden />
            </Link>
            <Link
              href="/patron/register"
              className="text-sm font-semibold text-[var(--gold-muted)] underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
