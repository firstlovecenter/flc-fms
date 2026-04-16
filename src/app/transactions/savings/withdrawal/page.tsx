import { requireStaff } from "@/lib/auth/guards";
import SavingsWithdrawalForm from "@/components/savings/SavingsWithdrawalForm";

export default async function SavingsWithdrawalPage() {
  await requireStaff("FACILITY_MANAGER");
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Withdraw from Savings</h1>
        <p className="text-sm page-subtitle">Return funds from the savings reserve back to the operating balance.</p>
      </div>
      <SavingsWithdrawalForm />
    </div>
  );
}
