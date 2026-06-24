-- Remove the unused Events feature (orphaned: never linked in nav, no booking ever set eventId).
-- Drops the events table and the bookings.eventId column + related foreign keys.

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_eventId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_createdById_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_facilityId_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "eventId";

-- DropTable
DROP TABLE "events";
