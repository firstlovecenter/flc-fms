-- Category-first hard cut migration (manual run; production-safe process required)

-- 0) Backfill the dynamic booking_categories table from existing category usage.
INSERT INTO "booking_categories" (
  "id", "name", "slug", "isCeremony", "isActive", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'bc_' || md5(src."category"),
  initcap(replace(lower(src."category"), '_', ' ')),
  src."category",
  EXISTS (
    SELECT 1 FROM "ceremony_time_slots" cts WHERE cts."category" = src."category"
  ),
  true,
  ROW_NUMBER() OVER (ORDER BY src."category"),
  now(),
  now()
FROM (
  SELECT DISTINCT "category" FROM "facility_pricing"
  UNION
  SELECT DISTINCT "category" FROM "facility_time_slots" WHERE "category" IS NOT NULL
  UNION
  SELECT DISTINCT "category" FROM "bookings"
  UNION
  SELECT DISTINCT "category" FROM "ceremony_time_slots"
) src
WHERE src."category" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "booking_categories" bc
    WHERE bc."slug" = src."category"
  );

-- 1) Ensure a default OTHER pricing row exists per facility for safe backfill targets.
INSERT INTO "facility_pricing" (
  "id", "facilityId", "category", "pricePerHour", "pricePerDay", "description", "isActive", "createdAt", "updatedAt", "freeDays"
)
SELECT
  'fp_' || md5(f.id || '_OTHER_' || now()::text),
  f."id",
  'OTHER',
  f."pricePerHour",
  f."pricePerDay",
  'Backfilled default category pricing',
  true,
  now(),
  now(),
  ARRAY[]::INTEGER[]
FROM "facilities" f
WHERE NOT EXISTS (
  SELECT 1 FROM "facility_pricing" fp
  WHERE fp."facilityId" = f."id" AND fp."category" = 'OTHER'
);

-- 2) Backfill null slot categories from latest facility pricing category; fallback to OTHER.
UPDATE "facility_time_slots" s
SET "category" = COALESCE(
  (
    SELECT fp."category"
    FROM "facility_pricing" fp
    WHERE fp."facilityId" = s."facilityId" AND fp."isActive" = true
    ORDER BY fp."updatedAt" DESC, fp."createdAt" DESC
    LIMIT 1
  ),
  'OTHER'
)
WHERE s."category" IS NULL;

-- 3) Ensure each slot (facilityId, category) has a parent pricing row.
INSERT INTO "facility_pricing" (
  "id", "facilityId", "category", "pricePerHour", "pricePerDay", "description", "isActive", "createdAt", "updatedAt", "freeDays"
)
SELECT
  'fp_' || md5(s."facilityId" || '_' || s."category" || '_' || now()::text),
  s."facilityId",
  s."category",
  f."pricePerHour",
  f."pricePerDay",
  'Backfilled from facility base pricing for slot linkage',
  true,
  now(),
  now(),
  ARRAY[]::INTEGER[]
FROM (
  SELECT DISTINCT "facilityId", "category"
  FROM "facility_time_slots"
) s
JOIN "facilities" f ON f."id" = s."facilityId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "facility_pricing" fp
  WHERE fp."facilityId" = s."facilityId" AND fp."category" = s."category"
);

-- 4) Add booking pricing audit fields.
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "resolvedUnitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "resolvedPricingSource" TEXT NOT NULL DEFAULT 'CATEGORY_BASE';

-- 5) Backfill legacy bookings with conservative defaults.
UPDATE "bookings"
SET
  "resolvedUnitPrice" = "totalAmount",
  "resolvedPricingSource" = 'LEGACY_MIGRATED'
WHERE "resolvedPricingSource" = 'CATEGORY_BASE' AND "resolvedUnitPrice" = 0;

-- 6) Enforce non-null slot category (category-scoped slots only).
ALTER TABLE "facility_time_slots"
  ALTER COLUMN "category" SET NOT NULL;

-- 7) Enforce slot -> facility pricing linkage via composite FK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'facility_time_slots_facilityId_category_fkey'
      AND table_name = 'facility_time_slots'
  ) THEN
    ALTER TABLE "facility_time_slots"
      ADD CONSTRAINT "facility_time_slots_facilityId_category_fkey"
      FOREIGN KEY ("facilityId", "category")
      REFERENCES "facility_pricing"("facilityId", "category")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
