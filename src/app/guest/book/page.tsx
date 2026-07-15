import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import GuestBookingForm from "@/components/public/GuestBookingForm";
import GuestItemBookingForm from "@/components/public/GuestItemBookingForm";
import PublicShell from "@/components/public/PublicShell";
import GuestPageHero from "@/components/public/GuestPageHero";
import { getCeremonyFacilityIds, getCeremonyDays } from "@/actions/ceremony-venue.actions";
import { getSiteSettings } from "@/actions/site-settings.actions";

import { Card } from "@/components/ui/card";

type SearchParams = {
  facilityId?: string;
  type?: string;
  lines?: string; // e.g. "item=abc123:2,bundle=xyz:1"
  ceremonyType?: string;
  codeId?: string;
};

/** Parse the ?lines= param from ItemsCatalogClient cart */
function parseLines(raw: string | undefined) {
  if (!raw) return [];
  return raw.split(",").flatMap(seg => {
    const [typeAndId, qtyStr] = seg.split(":");
    const qty = parseInt(qtyStr ?? "1", 10);
    if (!typeAndId || isNaN(qty) || qty < 1) return [];
    const [type, id] = typeAndId.split("=");
    if ((type !== "item" && type !== "bundle") || !id) return [];
    return [{ type: type as "item" | "bundle", id, qty }];
  });
}

export default async function GuestBookPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const isItemBooking = searchParams.type === "items";
  // A ceremony deep-link only needs the type (+ venue); the payment code is
  // collected in-form. Codeless links from the unified catalog still count.
  const isCeremonyBooking = !!searchParams.ceremonyType;

  // For ceremony bookings, look up the flat price
  let ceremonyFlatPrice: number | undefined;
  if (isCeremonyBooking && searchParams.facilityId && searchParams.ceremonyType) {
    const cfg = await prisma.ceremonyVenueConfig.findUnique({
      where: {
        facilityId_type: {
          facilityId: searchParams.facilityId,
          type: searchParams.ceremonyType as "WEDDING" | "NAMING",
        },
      },
    });
    if (cfg) ceremonyFlatPrice = Number(cfg.price);
  }

  // Fetch ceremony days for both filtering (ceremony) and blocking (general)
  const ceremonyDays = await getCeremonyDays();

  let facilities = (await prisma.facility.findMany({
    where: { isActive: true, underMaintenance: false },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      requiresBookingTerms: true,
      requiresItemBookingTerms: true,
      acUsageFee: true,
      amenities: true,
      availableDays: true,
      pricing: {
        where: { isActive: true },
        select: { price: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })).map(f => ({
    id: f.id,
    name: f.name,
    description: f.description,
    capacity: f.capacity,
    requiresBookingTerms: f.requiresBookingTerms,
    requiresItemBookingTerms: f.requiresItemBookingTerms,
    acUsageFee: Number(f.acUsageFee),
    amenities: f.amenities,
    availableDays: f.availableDays,
    pricePerHour: (f.pricing[0]?.price ?? 0).toString(),
  }));

  // For ceremony bookings: restrict venues to those configured for the ceremony type
  if (isCeremonyBooking && searchParams.ceremonyType) {
    const allowedIds = await getCeremonyFacilityIds(
      searchParams.ceremonyType as "WEDDING" | "NAMING"
    );
    facilities = facilities.filter((f) => allowedIds.includes(f.id));
  }

  // For item bookings: resolve pre-selected lines from URL
  let initialLines: Array<{
    type: "item" | "bundle";
    id: string;
    name: string;
    unitPrice: number;
    unit: string;
    qty: number;
    requiresBookingTerms: boolean;
    requiresItemBookingTerms: boolean;
  }> = [];

  if (isItemBooking) {
    const parsed = parseLines(searchParams.lines);
    for (const seg of parsed) {
      if (seg.type === "item") {
        const item = await prisma.bookableItem.findUnique({ where: { id: seg.id } });
        if (item) {
          initialLines.push({
            type: "item",
            id: item.id,
            name: item.name,
            unitPrice: Number(item.pricePerUnit),
            unit: item.unit,
            qty: seg.qty,
            requiresBookingTerms: item.requiresBookingTerms,
            requiresItemBookingTerms: item.requiresItemBookingTerms,
          });
        }
      } else {
        const bundle = await prisma.bookableBundle.findUnique({ where: { id: seg.id } });
        if (bundle) {
          initialLines.push({
            type: "bundle",
            id: bundle.id,
            name: bundle.name,
            unitPrice: Number(bundle.price),
            unit: "package",
            qty: seg.qty,
            requiresBookingTerms: bundle.requiresBookingTerms,
            requiresItemBookingTerms: bundle.requiresItemBookingTerms,
          });
        }
      }
    }
  }

  // Compute min start time server-side (now + 24 hours), formatted for datetime-local input
  const minStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const minStartTime = `${minStartDate.getFullYear()}-${pad(minStartDate.getMonth() + 1)}-${pad(minStartDate.getDate())}T${pad(minStartDate.getHours())}:${pad(minStartDate.getMinutes())}`;

  const siteSettings = await getSiteSettings();

  return (
    <PublicShell
      layout="top"
      current="guest"
      maxWidth="md"
      officePhone={siteSettings.officePhone || undefined}
      officeEmail={siteSettings.officeEmail || undefined}
    >
      <div className="space-y-6">
        <GuestPageHero
          eyebrow={isItemBooking ? "Items & Packages Booking" : "Public Booking"}
          title={isItemBooking ? "Item Booking Request" : "Guest Booking Request"}
          description={
            isItemBooking
              ? "Reserve items or packages for your external event. Our team will confirm availability and pricing."
              : <>Submit a booking as a guest, or <Link href="/patron/register" className="text-[var(--gold-pale)] underline">create an account</Link> to track your booking status.</>
          }
        >
            {isItemBooking ? (
              <>
                <span className="badge bg-[rgba(200,163,90,0.15)] text-[var(--gold-pale)] border border-[rgba(200,163,90,0.45)]">
                  {initialLines.length} item type{initialLines.length !== 1 ? "s" : ""} selected
                </span>
                <Link href="/?tab=items" className="badge bg-white/10 text-[#fff] border border-white/25 no-underline">
                  ← Back to Home
                </Link>
              </>
            ) : (
              <>
                <span className="badge bg-[rgba(200,163,90,0.15)] text-[var(--gold-pale)] border border-[rgba(200,163,90,0.45)]">
                  {facilities.length} facilities available
                </span>
                <span className="badge bg-white/10 text-[#fff] border border-white/25">
                  Same-day review by staff
                </span>
                <Link href="/?tab=items" className="badge bg-white/10 text-[#fff] border border-white/25 no-underline">
                  Browse items →
                </Link>
              </>
            )}
        </GuestPageHero>

        <section>
          {isItemBooking ? (
            <Card className="p-6 md:p-7 bg-gradient-to-b from-[#FFFFFF] to-[#FCFAF6] dark:from-[rgba(15,26,43,0.45)] dark:to-[rgba(15,26,43,0.45)]">
              <GuestItemBookingForm initialLines={initialLines} minStartTime={minStartTime} />
            </Card>
          ) : (
            <GuestBookingForm
              facilities={facilities}
              defaultFacilityId={searchParams.facilityId}
              isCeremonyBooking={isCeremonyBooking}
              ceremonyCodeId={searchParams.codeId}
              ceremonyFlatPrice={ceremonyFlatPrice}
              defaultCategory={searchParams.ceremonyType}
              ceremonyDays={ceremonyDays}
              officePhone={siteSettings.officePhone || undefined}
              officeEmail={siteSettings.officeEmail || undefined}
            />
          )}
        </section>
      </div>
    </PublicShell>
  );
}
