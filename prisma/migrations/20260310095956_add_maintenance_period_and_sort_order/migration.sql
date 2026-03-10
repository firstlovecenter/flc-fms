-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "maintenanceEndsAt" TIMESTAMP(3),
ADD COLUMN     "maintenanceStartsAt" TIMESTAMP(3),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
