-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_isActive_sortOrder_idx" ON "accounts"("isActive", "sortOrder");

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "accountId" TEXT;

-- CreateIndex
CREATE INDEX "expenses_accountId_idx" ON "expenses"("accountId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed a default account so expense approvals keep working immediately after this
-- migration; Facility Managers can rename it or add more from Transactions ▸ Accounts.
INSERT INTO "accounts" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES ('default-account', 'Main Account', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
