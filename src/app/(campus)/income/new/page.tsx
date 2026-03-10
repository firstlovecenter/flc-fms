import { requireStaff } from "@/lib/auth/guards";
import IncomeForm from "@/components/expenses/IncomeForm";

export default async function NewIncomePage() {
  await requireStaff("FACILITY_MANAGER");
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Record Income</h1>
        <p className="text-sm page-subtitle">Log a new income entry for this campus.</p>
      </div>
      <IncomeForm />
    </div>
  );
}
