-- Unified category-slot cleanup: remove ceremony-specific schema artifacts

ALTER TABLE "booking_categories"
  DROP COLUMN IF EXISTS "isCeremony";

DROP TABLE IF EXISTS "ceremony_time_slots";
DROP TABLE IF EXISTS "ceremony_days";
