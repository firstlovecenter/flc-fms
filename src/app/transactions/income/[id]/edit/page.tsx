import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isTransactionLocked } from "@/lib/transaction-lock";
import IncomeEditForm from "@/components/expenses/IncomeEditForm";

export default async function EditIncomePage({ params }: { params: { id: string } }) {
  await requirePerm("finance:record_income");

  const income = await prisma.income.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      narration: true,
      amount: true,
      category: true,
      source: true,
      receivedAt: true,
      createdAt: true,
    },
  });

  if (!income) notFound();

  if (isTransactionLocked(income.createdAt)) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="page-title">Edit Income</h1>
        <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-lg p-3">
          This transaction is locked because it is older than one week.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Edit Income</h1>
        <p className="text-sm page-subtitle">Update the selected income record.</p>
      </div>
      <IncomeEditForm
        income={{
          ...income,
          amount: Number(income.amount),
        }}
      />
    </div>
  );
}
