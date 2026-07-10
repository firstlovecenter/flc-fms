import { requirePerm } from "@/lib/auth/guards";
import { getAllAccountBalances } from "@/lib/finance";
import SavingsDepositForm from "@/components/savings/SavingsDepositForm";

export default async function SavingsDepositPage() {
  await requirePerm("finance:savings");
  const accounts = await getAllAccountBalances();
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Transfer to Savings</h1>
        <p className="text-sm page-subtitle">Move money from any account into savings.</p>
      </div>
      <SavingsDepositForm accounts={accounts} />
    </div>
  );
}
