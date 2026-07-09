-- AlterTable
ALTER TABLE "ceremony_booking_codes" ADD COLUMN     "facilityId" TEXT,
ADD COLUMN     "amountPaid" DECIMAL(10,2);

-- Backfill: for codes already redeemed into a booking (status = USED), the true
-- venue and amount paid are already known via the linked booking.
UPDATE "ceremony_booking_codes" c
SET "facilityId" = b."facilityId",
    "amountPaid" = b."totalAmount"
FROM "bookings" b
WHERE c."bookingId" = b."id"
  AND c."status" = 'USED'
  AND b."facilityId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "ceremony_booking_codes_facilityId_idx" ON "ceremony_booking_codes"("facilityId");

-- AddForeignKey
ALTER TABLE "ceremony_booking_codes" ADD CONSTRAINT "ceremony_booking_codes_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
