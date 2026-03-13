import { requirePermission } from "@/lib/auth/guards";
import ExpenseForm from "@/components/expenses/ExpenseForm";

export default async function NewExpensePage() {
  await requirePermission("canSubmitExpenses");
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Submit Expense Request</h1>
        <p className="text-sm page-subtitle">Facility Managers can approve your request.</p>
      </div>
      <ExpenseForm />
    </div>
  );
}
