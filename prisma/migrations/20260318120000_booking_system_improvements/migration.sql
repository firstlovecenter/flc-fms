-- ─── Booking System Improvements Migration ────────────────────────────────────

-- 1. Add dedicated acRequested boolean column to bookings.
--    Replaces the fragile "AC_REQUESTED" substring stored in the notes field.
ALTER TABLE "bookings" ADD COLUMN "acRequested" BOOLEAN NOT NULL DEFAULT false;

-- 2. Back-fill from existing notes: any booking whose notes contained the
--    "AC_REQUESTED" marker is migrated to acRequested = true.
UPDATE "bookings"
SET "acRequested" = true
WHERE "notes" LIKE '%AC_REQUESTED%';

-- 3. Strip the AC_REQUESTED marker from notes now that it lives in its own column.
--    Handles three cases: marker at start, middle, or end of the notes string.
UPDATE "bookings"
SET "notes" = NULLIF(
  TRIM(
    REGEXP_REPLACE("notes", '(\n?AC_REQUESTED\n?|AC_REQUESTED)', '', 'g')
  ),
  ''
)
WHERE "notes" LIKE '%AC_REQUESTED%';

-- 4. Add a category index to bookings for faster category-filtered queries.
CREATE INDEX "bookings_category_idx" ON "bookings"("category");

-- 5. Replace the existing facility_time_slots index (facilityId, dayOfWeek, isActive)
--    with a broader index that includes category — the queries in findApplicableTimeSlot
--    and getFacilityAvailability always filter on (facilityId, category, dayOfWeek, isActive).
DROP INDEX IF EXISTS "facility_time_slots_facilityId_dayOfWeek_isActive_idx";
CREATE INDEX "facility_time_slots_facilityId_category_dayOfWeek_isActive_idx"
  ON "facility_time_slots"("facilityId", "category", "dayOfWeek", "isActive");
