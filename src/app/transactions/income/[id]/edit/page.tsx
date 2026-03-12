import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import IncomeEditForm from "@/components/expenses/IncomeEditForm";

export default async function EditIncomePage({ params }: { params: { id: string } }) {
  await requireStaff("FACILITY_MANAGER");

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
    },
  });

  if (!income) notFound();

  return (
    <div className="max-w-2xl space-y-6">
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
