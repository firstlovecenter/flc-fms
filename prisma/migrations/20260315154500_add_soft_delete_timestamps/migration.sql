-- Soft-delete support for selected domains
ALTER TABLE "bookings" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "expenses" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "income" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "inventory_categories" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "deletedAt" TIMESTAMP(3);
