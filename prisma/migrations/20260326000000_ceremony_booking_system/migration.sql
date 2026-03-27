-- CreateEnum
CREATE TYPE "CeremonyType" AS ENUM ('WEDDING', 'NAMING');

-- CreateEnum
CREATE TYPE "CeremonyCodeStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "ceremonyDetails" JSONB;

-- CreateTable
CREATE TABLE "ceremony_venue_configs" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "type" "CeremonyType" NOT NULL,
    "images" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ceremony_venue_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ceremony_booking_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "CeremonyCodeStatus" NOT NULL DEFAULT 'PENDING',
    "ceremonyType" "CeremonyType" NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterPhone" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ceremony_booking_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ceremony_venue_configs_facilityId_type_key" ON "ceremony_venue_configs"("facilityId", "type");

-- CreateIndex
CREATE INDEX "ceremony_venue_configs_type_isActive_idx" ON "ceremony_venue_configs"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ceremony_booking_codes_code_key" ON "ceremony_booking_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ceremony_booking_codes_bookingId_key" ON "ceremony_booking_codes"("bookingId");

-- CreateIndex
CREATE INDEX "ceremony_booking_codes_status_idx" ON "ceremony_booking_codes"("status");

-- CreateIndex
CREATE INDEX "ceremony_booking_codes_requesterEmail_idx" ON "ceremony_booking_codes"("requesterEmail");

-- AddForeignKey
ALTER TABLE "ceremony_venue_configs" ADD CONSTRAINT "ceremony_venue_configs_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ceremony_booking_codes" ADD CONSTRAINT "ceremony_booking_codes_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ceremony_booking_codes" ADD CONSTRAINT "ceremony_booking_codes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
