-- Repair schema drift from databases where ceremony_date_overrides was created
-- before override types (ADD/EXCLUDE) were introduced and the later migration
-- was manually marked as applied.
DO $$
BEGIN
    CREATE TYPE "CeremonyDateOverrideType" AS ENUM ('ADD', 'EXCLUDE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ceremony_date_overrides"
ADD COLUMN IF NOT EXISTS "type" "CeremonyDateOverrideType" NOT NULL DEFAULT 'ADD';
