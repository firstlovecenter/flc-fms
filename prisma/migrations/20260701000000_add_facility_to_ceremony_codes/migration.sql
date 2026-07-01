-- AlterTable
ALTER TABLE "ceremony_booking_codes" ADD COLUMN "facilityId" TEXT;

-- CreateIndex
CREATE INDEX "ceremony_booking_codes_facilityId_idx" ON "ceremony_booking_codes"("facilityId");

-- AddForeignKey
ALTER TABLE "ceremony_booking_codes" ADD CONSTRAINT "ceremony_booking_codes_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
