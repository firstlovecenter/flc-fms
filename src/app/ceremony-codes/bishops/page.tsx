import { requirePerm } from "@/lib/auth/guards";
import { getBishops } from "@/actions/bishop.actions";
import BishopManager from "@/components/ceremony/BishopManager";

export const metadata = { title: "Bishops" };

export default async function BishopsPage() {
  await requirePerm("ceremony:manage");
  const bishops = await getBishops(true);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Bishops</h1>
        <p className="page-subtitle">
          Manage the list of Bishops selectable on the wedding and naming ceremony booking forms.
        </p>
      </div>
      <BishopManager initialBishops={bishops} />
    </div>
  );
}
