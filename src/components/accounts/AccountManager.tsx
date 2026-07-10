"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import {
  createAccount,
  updateAccount,
  toggleAccount,
} from "@/actions/account.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  balance: number;
}

export default function AccountManager({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setAdding(false);
    setError(null);
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setName("");
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updateAccount(editingId, { name })
        : await createAccount({ name });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        cancel();
        window.location.reload();
      }
    });
  }

  function handleToggle(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await toggleAccount(id);
      if ("error" in result && result.error) {
        setError(result.error);
      } else if (result.success) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
        );
      }
    });
  }

  return (
    <Card className="p-6 space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      <p className="text-xs text-[var(--muted)]">
        Accounts can be deactivated but never deleted — they're permanently tied to financial history.
      </p>

      <div className="space-y-2">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between py-3 px-4 bg-white border border-[var(--border)] rounded-xl flex-wrap gap-2">
            {editingId === account.id ? (
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <Input
                  className="text-sm flex-1 min-w-[140px]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Account name"
                  autoFocus
                />
                <button onClick={handleSave} disabled={isPending} aria-label="Save" className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20">
                  <Check size={14} />
                </button>
                <button onClick={cancel} aria-label="Cancel" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${account.isActive ? "text-[var(--navy)]" : "text-gray-400 line-through"}`}>
                    {account.name}
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${account.balance >= 0 ? "text-success" : "text-danger"}`}>
                    {formatCurrency(account.balance)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(account.id)}
                    disabled={isPending}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      account.isActive
                        ? "bg-success/10 text-success border-success/25 hover:bg-success/20"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {account.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => startEdit(account)}
                    aria-label="Edit account"
                    className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--navy)]"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {accounts.length === 0 && !adding && (
          <p className="text-sm text-[var(--muted)] py-4 text-center">No accounts added yet.</p>
        )}
      </div>

      {adding ? (
        <div className="flex items-center gap-3 py-3 px-4 bg-gold-pale border border-[var(--navy)] rounded-xl flex-wrap">
          <Input
            className="text-sm flex-1 min-w-[140px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name"
            autoFocus
          />
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Add"}
          </Button>
          <Button variant="outline" onClick={cancel}>Cancel</Button>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="flex items-center gap-2 text-sm text-[var(--navy)] hover:text-[var(--gold)] transition-colors py-1"
        >
          <Plus size={15} /> Add Account
        </button>
      )}
    </Card>
  );
}
