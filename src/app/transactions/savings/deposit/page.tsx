import { requireStaff } from "@/lib/auth/guards";
import { getAvailableBalance } from "@/lib/finance";
import SavingsDepositForm from "@/components/savings/SavingsDepositForm";

export default async function SavingsDepositPage() {
  await requireStaff("FACILITY_MANAGER");
  const { availableBalance } = await getAvailableBalance();
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Transfer to Savings</h1>
        <p className="text-sm page-subtitle">Move money from the operating account into the savings account.</p>
      </div>
      <SavingsDepositForm availableBalance={availableBalance} />
    </div>
  );
}
