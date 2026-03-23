-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "checkInRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN "checkInRequestedAt" TIMESTAMP(3);
