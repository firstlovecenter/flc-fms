-- AlterTable
ALTER TABLE "income" ADD COLUMN "accountId" TEXT;

-- CreateIndex
CREATE INDEX "income_accountId_idx" ON "income"("accountId");

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "savings_transactions" ADD COLUMN "accountId" TEXT;

-- CreateIndex
CREATE INDEX "savings_transactions_accountId_idx" ON "savings_transactions"("accountId");

-- AddForeignKey
ALTER TABLE "savings_transactions" ADD CONSTRAINT "savings_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Formalise the seeded default account as the "Expense Account" — the account that all
-- pre-existing (pre-multi-account) financial history implicitly belonged to. Only rename
-- if it's still the untouched seed name, so we don't clobber an FM's deliberate rename.
UPDATE "accounts" SET "name" = 'Expense Account' WHERE "id" = 'default-account' AND "name" = 'Main Account';

-- Backfill every historical Income and SavingsTransaction row, and every already-APPROVED
-- Expense, onto the Expense Account, so each account's newly-independent balance continues
-- exactly where the old single combined ledger left off, instead of resetting to zero.
-- PENDING/REJECTED expenses are left unassigned — no money has moved for them yet, and
-- approveExpense always sets accountId itself when the FM picks an account at approval time.
UPDATE "expenses" SET "accountId" = 'default-account' WHERE "accountId" IS NULL AND "status" = 'APPROVED';
UPDATE "income" SET "accountId" = 'default-account' WHERE "accountId" IS NULL;
UPDATE "savings_transactions" SET "accountId" = 'default-account' WHERE "accountId" IS NULL;
