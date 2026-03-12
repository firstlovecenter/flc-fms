import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import ExpenseEditForm from "@/components/expenses/ExpenseEditForm";

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  await requireStaff("FACILITY_MANAGER");

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      narration: true,
      amount: true,
      category: true,
    },
  });

  if (!expense) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Edit Expense</h1>
        <p className="text-sm page-subtitle">Update the selected expense record.</p>
      </div>
      <ExpenseEditForm
        expense={{
          ...expense,
          amount: Number(expense.amount),
        }}
      />
    </div>
  );
}
