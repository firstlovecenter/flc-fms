import { requireStaff } from "@/lib/auth/guards";
import SavingsDepositForm from "@/components/savings/SavingsDepositForm";

export default async function SavingsDepositPage() {
  await requireStaff("FACILITY_MANAGER");
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Deposit to Savings</h1>
        <p className="text-sm page-subtitle">Move funds from the operating balance into the savings reserve.</p>
      </div>
      <SavingsDepositForm />
    </div>
  );
}
