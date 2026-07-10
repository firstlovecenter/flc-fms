"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";

const AccountSchema = z.object({
  name: z.string().min(2, "Account name is required").max(100),
});

/**
 * Active accounts for account pickers (expense approval, income entry, savings transfer).
 * Pass `includeAccountId` to also include one specific inactive account — e.g. a record
 * being edited that's assigned to an account that's since been deactivated, so its current
 * value still shows up as a selectable option.
 */
export async function getActiveAccounts(includeAccountId?: string) {
  return prisma.account.findMany({
    where: includeAccountId ? { OR: [{ isActive: true }, { id: includeAccountId }] } : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/** Staff: list all accounts (active + inactive) for the management screen. */
export async function getAccounts() {
  await requirePerm("finance:manage_accounts");
  return prisma.account.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createAccount(data: z.infer<typeof AccountSchema>) {
  const session = await requirePerm("finance:manage_accounts");
  const validated = AccountSchema.parse(data);

  const existing = await prisma.account.findFirst({ where: { name: validated.name } });
  if (existing) return { error: "An account with that name already exists." };

  const maxOrder = await prisma.account.aggregate({ _max: { sortOrder: true } });

  const account = await prisma.account.create({
    data: {
      name: validated.name,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  auditLog({ userId: session.sub, action: "CREATE_ACCOUNT", entity: "Account", entityId: account.id, after: account });
  revalidatePath("/transactions/accounts");
  return { success: true, account };
}

export async function updateAccount(id: string, data: z.infer<typeof AccountSchema>) {
  const session = await requirePerm("finance:manage_accounts");
  const validated = AccountSchema.parse(data);

  const conflict = await prisma.account.findFirst({ where: { name: validated.name, NOT: { id } } });
  if (conflict) return { error: "An account with that name already exists." };

  const account = await prisma.account.update({
    where: { id },
    data: { name: validated.name },
  });

  auditLog({ userId: session.sub, action: "UPDATE_ACCOUNT", entity: "Account", entityId: id, after: account });
  revalidatePath("/transactions/accounts");
  return { success: true, account };
}

/** Toggle an account active/inactive (hides it from the approval picker without deleting history). */
export async function toggleAccount(id: string) {
  const session = await requirePerm("finance:manage_accounts");
  const account = await prisma.account.findUniqueOrThrow({ where: { id } });

  if (account.isActive) {
    const otherActiveCount = await prisma.account.count({ where: { isActive: true, NOT: { id } } });
    if (otherActiveCount === 0) {
      return { error: "At least one account must stay active so expenses can still be approved." };
    }
  }

  const updated = await prisma.account.update({
    where: { id },
    data: { isActive: !account.isActive },
  });

  auditLog({ userId: session.sub, action: "TOGGLE_ACCOUNT", entity: "Account", entityId: id, after: updated });
  revalidatePath("/transactions/accounts");
  return { success: true, account: updated };
}

