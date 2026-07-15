-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "bookings_approvedById_idx" ON "bookings"("approvedById");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: bookings already approved before this column existed have no
-- recorded approver. Leave them NULL — the UI falls back to "Unknown" rather
-- than fabricate an approver for historical rows.
