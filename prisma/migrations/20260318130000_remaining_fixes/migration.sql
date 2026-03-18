-- ─── Remaining Fixes Migration ────────────────────────────────────────────────

-- 1. Add deletedAt to facilities for a consistent soft-delete audit trail.
--    The application already uses isActive=false for deletion, but deletedAt
--    captures when the record was deleted and aligns with the pattern used
--    by bookings, expenses, income, and events.
ALTER TABLE "facilities" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- 2. Enforce booking ownership at the database level.
--    Every booking must belong to either a staff user (userId) or a patron
--    (patronId). Having neither is a data-integrity error that the application
--    guards against, but the DB constraint makes it impossible to bypass.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_owner_check"
  CHECK ("userId" IS NOT NULL OR "patronId" IS NOT NULL);
