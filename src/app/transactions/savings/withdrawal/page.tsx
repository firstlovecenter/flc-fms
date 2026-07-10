import { requirePerm } from "@/lib/auth/guards";
import { getNetSavings } from "@/lib/finance";
import { getActiveAccounts } from "@/actions/account.actions";
import SavingsWithdrawalForm from "@/components/savings/SavingsWithdrawalForm";

export default async function SavingsWithdrawalPage() {
  await requirePerm("finance:savings");
  const [savingsBalance, accounts] = await Promise.all([
    getNetSavings(),
    getActiveAccounts(),
  ]);
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Withdraw from Savings</h1>
        <p className="text-sm page-subtitle">Move money from savings back into an account.</p>
      </div>
      <SavingsWithdrawalForm savingsBalance={savingsBalance} accounts={accounts} />
    </div>
  );
}
