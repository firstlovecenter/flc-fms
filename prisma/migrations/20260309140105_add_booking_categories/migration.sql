-- CreateEnum
CREATE TYPE "BookingCategory" AS ENUM ('CHURCH_SERVICE', 'WEDDING', 'FUNERAL', 'MEETING', 'CONFERENCE', 'WORKSHOP', 'BIRTHDAY_PARTY', 'CONCERT', 'REHEARSAL', 'OTHER');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "category" "BookingCategory" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "facility_pricing" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "category" "BookingCategory" NOT NULL,
    "pricePerHour" DECIMAL(10,2) NOT NULL,
    "pricePerDay" DECIMAL(10,2),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facility_pricing_facilityId_isActive_idx" ON "facility_pricing"("facilityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "facility_pricing_facilityId_category_key" ON "facility_pricing"("facilityId", "category");

-- AddForeignKey
ALTER TABLE "facility_pricing" ADD CONSTRAINT "facility_pricing_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
