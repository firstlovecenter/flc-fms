import { prisma } from "@/lib/db/prisma";

export async function getTotalIncomeIncludingBookingRevenue(): Promise<{
  recordedIncome: number;
  paidBookingRevenue: number;
  totalIncome: number;
}> {
  const incomeAgg = await prisma.income.aggregate({
    where: { deletedAt: null },
    _sum: { amount: true },
  });

  const recordedIncome = Number(incomeAgg._sum.amount ?? 0);

  return {
    recordedIncome,
    paidBookingRevenue: 0,
    totalIncome: recordedIncome,
  };
}

export async function getNetSavings(): Promise<number> {
  const agg = await prisma.savingsTransaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });
  const deposits    = Number(agg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
  const withdrawals = Number(agg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
  return deposits - withdrawals;
}

export interface SavingsStatementRow {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  narration: string;
  createdAt: Date;
  createdByName: string;
  /** The operating account the deposit came from / the withdrawal was paid back into. */
  accountName: string | null;
  /** Savings balance after this transaction, computed over the full history. */
  balanceAfter: number;
}

export interface SavingsStatement {
  rows: SavingsStatementRow[]; // newest first, filtered
  deposits: number;            // unfiltered totals
  withdrawals: number;
  netSavings: number;
}

/**
 * Bank-statement view of the savings account. The running balance is always
 * computed over the FULL history so it stays correct when filters are applied.
 */
export async function getSavingsStatement(filters?: {
  type?: "DEPOSIT" | "WITHDRAWAL";
  from?: Date;
  to?: Date;
}): Promise<SavingsStatement> {
  const all = await prisma.savingsTransaction.findMany({
    include: {
      createdBy: { select: { name: true } },
      account:   { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let balance = 0;
  let deposits = 0;
  let withdrawals = 0;
  const withBalance: SavingsStatementRow[] = all.map((t) => {
    const amount = Number(t.amount);
    if (t.type === "DEPOSIT") {
      balance += amount;
      deposits += amount;
    } else {
      balance -= amount;
      withdrawals += amount;
    }
    return {
      id: t.id,
      type: t.type,
      amount,
      narration: t.narration,
      createdAt: t.createdAt,
      createdByName: t.createdBy.name,
      accountName: t.account?.name ?? null,
      balanceAfter: balance,
    };
  });

  const rows = withBalance
    .filter((r) => {
      if (filters?.type && r.type !== filters.type) return false;
      if (filters?.from && r.createdAt < filters.from) return false;
      if (filters?.to && r.createdAt > filters.to) return false;
      return true;
    })
    .reverse(); // newest first

  return { rows, deposits, withdrawals, netSavings: balance };
}

type FinanceClient = {
  income: { aggregate: typeof prisma.income.aggregate };
  expense: { aggregate: typeof prisma.expense.aggregate };
  savingsTransaction: { groupBy: typeof prisma.savingsTransaction.groupBy };
};

/**
 * A single account's independent balance: income recorded against it, minus approved
 * expenses paid from it, minus savings deposits sourced from it, plus savings withdrawals
 * paid back into it. Pass `client` (a Prisma `$transaction` callback client) to compute
 * this consistently inside an advisory-lock transaction.
 */
export async function getAccountBalance(accountId: string, client: FinanceClient = prisma): Promise<number> {
  const [incomeAgg, expenseAgg, savingsAgg] = await Promise.all([
    client.income.aggregate({
      where: { accountId, deletedAt: null },
      _sum: { amount: true },
    }),
    client.expense.aggregate({
      where: { accountId, status: "APPROVED", deletedAt: null },
      _sum: { amount: true },
    }),
    client.savingsTransaction.groupBy({
      by: ["type"],
      where: { accountId },
      _sum: { amount: true },
    }),
  ]);

  const income      = Number(incomeAgg._sum.amount ?? 0);
  const expenses     = Number(expenseAgg._sum.amount ?? 0);
  const deposits     = Number(savingsAgg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
  const withdrawals  = Number(savingsAgg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);

  return income - expenses - deposits + withdrawals;
}

export interface AccountWithBalance {
  id: string;
  name: string;
  isActive: boolean;
  balance: number;
}

/** Every account (active-only by default) with its computed balance, for FM-facing summaries. */
export async function getAllAccountBalances(includeInactive = false): Promise<AccountWithBalance[]> {
  const accounts = await prisma.account.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true },
  });

  return Promise.all(accounts.map(async (a) => ({ ...a, balance: await getAccountBalance(a.id) })));
}
