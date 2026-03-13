import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Public GET endpoint consumed by the service worker for offline catalog caching.
 * No auth required — same data shown on the public homepage.
 * Cache-Control set to allow SW stale-while-revalidate for up to 1 hour.
 */
export async function GET() {
  try {
    const now = new Date();

    const [rawFacilities, rawItems, rawBundles] = await Promise.all([
      prisma.facility.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true, description: true, capacity: true,
          pricePerHour: true, availableFrom: true, availableTo: true,
          amenities: true, images: true, sortOrder: true,
          underMaintenance: true, maintenanceStartsAt: true, maintenanceEndsAt: true,
          pricing: { select: { category: true }, where: { isActive: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.bookableItem.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.bookableBundle.findMany({
        where: { isActive: true },
        include: { components: { include: { item: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    const facilities = rawFacilities
      .map((f) => {
        const expired =
          f.underMaintenance &&
          f.maintenanceEndsAt &&
          new Date(f.maintenanceEndsAt) < now;
        return {
          ...f,
          underMaintenance: expired ? false : f.underMaintenance,
          pricePerHour: f.pricePerHour.toString(),
          supportedCategories: f.pricing.map((p) => p.category as string),
          maintenanceStartsAt: f.maintenanceStartsAt?.toISOString() ?? null,
          maintenanceEndsAt: f.maintenanceEndsAt?.toISOString() ?? null,
          pricing: undefined,
        };
      })
      .sort((a, b) =>
        a.underMaintenance === b.underMaintenance ? 0 : a.underMaintenance ? 1 : -1,
      );

    const items = rawItems.map((i) => ({
      ...i,
      pricePerUnit: i.pricePerUnit.toString(),
    }));

    const bundles = rawBundles.map((b) => ({
      ...b,
      price: b.price.toString(),
      components: b.components.map((c) => ({
        ...c,
        item: { ...c.item, pricePerUnit: c.item.pricePerUnit.toString() },
      })),
    }));

    return NextResponse.json(
      { facilities, items, bundles, cachedAt: now.toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}
