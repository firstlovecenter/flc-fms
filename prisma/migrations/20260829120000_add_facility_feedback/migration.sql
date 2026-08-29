-- CreateEnum
CREATE TYPE "FacilityFeedbackType" AS ENUM ('COMPLAINT', 'FEEDBACK', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "FacilityFeedbackStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "facility_feedback" (
    "id" TEXT NOT NULL,
    "type" "FacilityFeedbackType" NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "submitterName" TEXT,
    "submitterEmail" TEXT,
    "submitterPhone" TEXT,
    "facilityId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FacilityFeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facility_feedback_status_createdAt_idx" ON "facility_feedback"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "facility_feedback" ADD CONSTRAINT "facility_feedback_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_feedback" ADD CONSTRAINT "facility_feedback_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Additive only: grant feedback access to Booking Manager–style STAFF accounts
-- (identified by ceremony:manage + bookings:approve). Does not remove any keys.
-- Facility Managers / Super Admins already get these via role presets at resolve time.
UPDATE "users"
SET permissions = COALESCE(permissions, '{}'::jsonb)
  || '{"feedback:view":true,"feedback:manage":true}'::jsonb
WHERE role = 'STAFF'
  AND COALESCE((permissions->>'bookings:approve')::boolean, false)
  AND COALESCE((permissions->>'ceremony:manage')::boolean, false);

-- If any users still have the legacy BOOKING_MANAGER role, grant the same keys.
UPDATE "users"
SET permissions = COALESCE(permissions, '{}'::jsonb)
  || '{"feedback:view":true,"feedback:manage":true}'::jsonb
WHERE role = 'BOOKING_MANAGER';
