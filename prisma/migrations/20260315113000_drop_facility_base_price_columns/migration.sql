ALTER TABLE "facilities"
  DROP COLUMN "pricePerHour",
  DROP COLUMN "pricePerDay";

ALTER TABLE "facility_pricing"
  RENAME COLUMN "pricePerHour" TO "price";

ALTER TABLE "facility_pricing"
  DROP COLUMN "pricePerDay";
