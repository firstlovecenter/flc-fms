import { requirePerm } from "@/lib/auth/guards";
import { listCeremonyCodes } from "@/actions/ceremony-code.actions";
import { listCeremonyDateOverrides } from "@/actions/ceremony-venue.actions";
import CeremonyCodesClient from "@/components/ceremony/CeremonyCodesClient";

export const metadata = { title: "Ceremony Codes" };

export default async function CeremonyCodesPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string; page?: string };
}) {
  await requirePerm("ceremony:manage");

  const [{ codes, total }, dateOverrides] = await Promise.all([
    listCeremonyCodes({
      status: searchParams.status,
      search: searchParams.search,
      page: searchParams.page ? Number(searchParams.page) : 1,
    }),
    listCeremonyDateOverrides(),
  ]);

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="page-title">Ceremony Codes</h1>
        <p className="page-subtitle mt-1">
          Manage payment codes for wedding and naming ceremony bookings.
        </p>
      </div>
      <CeremonyCodesClient initialCodes={codes} total={total} initialDateOverrides={dateOverrides} />
    </div>
  );
}
