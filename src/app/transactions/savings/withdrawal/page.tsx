import { requireStaff } from "@/lib/auth/guards";
import { getNetSavings } from "@/lib/finance";
import SavingsWithdrawalForm from "@/components/savings/SavingsWithdrawalForm";

export default async function SavingsWithdrawalPage() {
  await requireStaff("FACILITY_MANAGER");
  const savingsBalance = await getNetSavings();
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Transfer to Operating Account</h1>
        <p className="text-sm page-subtitle">Move money from the savings account back into the operating account.</p>
      </div>
      <SavingsWithdrawalForm savingsBalance={savingsBalance} />
    </div>
  );
}
