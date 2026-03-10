-- CreateTable
CREATE TABLE "facility_time_slots" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isFlexible" BOOLEAN NOT NULL DEFAULT false,
    "maxBookings" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facility_time_slots_facilityId_dayOfWeek_isActive_idx" ON "facility_time_slots"("facilityId", "dayOfWeek", "isActive");

-- AddForeignKey
ALTER TABLE "facility_time_slots" ADD CONSTRAINT "facility_time_slots_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
