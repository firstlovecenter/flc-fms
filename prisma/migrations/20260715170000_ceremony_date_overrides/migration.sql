-- CreateEnum
CREATE TYPE "CeremonyDateOverrideType" AS ENUM ('ADD', 'EXCLUDE');

-- CreateTable
-- NOTE: this table was referenced throughout the app (isCeremonyDay(),
-- getCeremonyDays(), the Ceremony Dates admin tab) but never had a migration
-- committed for it — this migration creates it for the first time. If a given
-- database already has this table (e.g. from a manual `prisma db push` while
-- the feature was being developed), run
-- `prisma migrate resolve --applied 20260715170000_ceremony_date_overrides`
-- against it instead of letting `migrate deploy` execute this file.
CREATE TABLE "ceremony_date_overrides" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "CeremonyDateOverrideType" NOT NULL DEFAULT 'ADD',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ceremony_date_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ceremony_date_overrides_date_key" ON "ceremony_date_overrides"("date");

-- AddForeignKey
ALTER TABLE "ceremony_date_overrides" ADD CONSTRAINT "ceremony_date_overrides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
