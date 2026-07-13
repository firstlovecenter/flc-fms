-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "spentAt" TIMESTAMP(3);

-- Backfill: historical approved expenses took effect on the account when they were
-- approved, so pin their spend date to that moment (falling back to creation time for
-- any row approved before approvedAt existed). Pending/rejected rows stay NULL — no
-- money has moved for them, and code falls back to approvedAt/createdAt when unset.
UPDATE "expenses" SET "spentAt" = COALESCE("approvedAt", "createdAt") WHERE "status" = 'APPROVED';
