import { requirePerm } from "@/lib/auth/guards";
import { getAccounts } from "@/actions/account.actions";
import { getAllAccountBalances } from "@/lib/finance";
import AccountManager from "@/components/accounts/AccountManager";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  await requirePerm("finance:manage_accounts");
  const [accounts, balances] = await Promise.all([
    getAccounts(),
    getAllAccountBalances(true),
  ]);
  const balanceById = new Map(balances.map((b) => [b.id, b.balance]));
  const accountsWithBalance = accounts.map((a) => ({ ...a, balance: balanceById.get(a.id) ?? 0 }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Accounts</h1>
        <p className="page-subtitle">
          Manage your independent money accounts. Each has its own balance, and can be selected
          when approving an expense, recording income, or transferring to/from savings.
        </p>
      </div>
      <AccountManager initialAccounts={accountsWithBalance} />
    </div>
  );
}
