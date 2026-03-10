-- AlterTable
ALTER TABLE "facility_pricing" ADD COLUMN     "freeDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
