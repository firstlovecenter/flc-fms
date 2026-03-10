-- AlterTable
ALTER TABLE "facility_time_slots" ADD COLUMN     "category" "BookingCategory",
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricePerHourOverride" DECIMAL(10,2);
