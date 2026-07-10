import { requirePerm } from "@/lib/auth/guards";
import { getActiveAccounts } from "@/actions/account.actions";
import IncomeForm from "@/components/expenses/IncomeForm";

export default async function NewIncomePage() {
  await requirePerm("finance:record_income");
  const accounts = await getActiveAccounts();
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Record Income</h1>
        <p className="text-sm page-subtitle">Log a new income entry.</p>
      </div>
      <IncomeForm accounts={accounts} />
    </div>
  );
}
