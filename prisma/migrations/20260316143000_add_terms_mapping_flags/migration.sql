-- Add per-entity terms mapping flags for booking agreement flows
ALTER TABLE "facilities"
  ADD COLUMN "requiresBookingTerms" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requiresItemBookingTerms" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "bookable_items"
  ADD COLUMN "requiresBookingTerms" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresItemBookingTerms" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "bookable_bundles"
  ADD COLUMN "requiresBookingTerms" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresItemBookingTerms" BOOLEAN NOT NULL DEFAULT true;
