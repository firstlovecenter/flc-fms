import Link from "next/link";
import type { CeremonyCodeStatus, Prisma } from "@prisma/client";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import CeremonyCodesClient from "@/components/ceremony/CeremonyCodesClient";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ceremony Codes" };

const CODE_STATUSES = new Set<CeremonyCodeStatus>(["PENDING", "ACTIVE", "USED", "EXPIRED"]);

export default async function CeremonyCodesPage(props: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  await requirePerm("ceremony:manage");

  const parsedPage = Number(searchParams.page);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 20;
  const status = searchParams.status as CeremonyCodeStatus | undefined;
  const where: Prisma.CeremonyBookingCodeWhereInput = {
    ...(status && CODE_STATUSES.has(status) ? { status } : {}),
    ...(searchParams.search
      ? {
          OR: [
            { requesterName: { contains: searchParams.search, mode: "insensitive" as const } },
            { requesterEmail: { contains: searchParams.search, mode: "insensitive" as const } },
            { requesterPhone: { contains: searchParams.search } },
          ],
        }
      : {}),
  };

  // Keep this render deliberately sequential. Apart from avoiding redundant
  // permission/session reads, it prevents a small page from opening several
  // pooled database connections at once in a serverless function.
  const codes = await prisma.ceremonyBookingCode.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      activatedBy: { select: { name: true } },
      facility: { select: { id: true, name: true } },
    },
  });
  const total = await prisma.ceremonyBookingCode.count({ where });

  // Date overrides are an auxiliary tab. If an older deployment/database is
  // briefly out of sync, code management should still remain available.
  const dateOverrides = await prisma.ceremonyDateOverride
    .findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { date: "asc" },
    })
    .catch((error) => {
      console.error("[ceremony-codes] Unable to load date overrides", error);
      return [];
    });

  return (
    <div className="w-full space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Ceremony Codes</h1>
          <p className="page-subtitle mt-1">
            Manage payment codes for wedding and naming ceremony bookings.
          </p>
        </div>
        <Link href="/ceremony-codes/bishops" className={cn(buttonVariants({ variant: "outline" }))}>
          Bishops
        </Link>
      </div>
      <CeremonyCodesClient
        initialCodes={codes.map((c) => ({ ...c, amountPaid: c.amountPaid != null ? Number(c.amountPaid) : null }))}
        total={total}
        initialDateOverrides={dateOverrides}
      />
    </div>
  );
}
