import { requirePerm } from "@/lib/auth/guards";
import { getAccounts } from "@/actions/account.actions";
import AccountManager from "@/components/accounts/AccountManager";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  await requirePerm("finance:manage_accounts");
  const accounts = await getAccounts();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Accounts</h1>
        <p className="page-subtitle">
          Manage the payment-source accounts (bank, mobile money, cash) selectable when approving an expense.
        </p>
      </div>
      <AccountManager initialAccounts={accounts} />
    </div>
  );
}
