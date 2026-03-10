-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_facilityId_fkey";

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "facilityId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "bookable_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "images" TEXT[],
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookable_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookable_bundles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "images" TEXT[],
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookable_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_components" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,

    CONSTRAINT "bundle_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_line_items" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "itemId" TEXT,
    "bundleId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "booking_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookable_items_isActive_idx" ON "bookable_items"("isActive");

-- CreateIndex
CREATE INDEX "bookable_bundles_isActive_idx" ON "bookable_bundles"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_components_bundleId_itemId_key" ON "bundle_components"("bundleId", "itemId");

-- CreateIndex
CREATE INDEX "booking_line_items_bookingId_idx" ON "booking_line_items"("bookingId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_components" ADD CONSTRAINT "bundle_components_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bookable_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_components" ADD CONSTRAINT "bundle_components_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "bookable_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_line_items" ADD CONSTRAINT "booking_line_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_line_items" ADD CONSTRAINT "booking_line_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "bookable_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_line_items" ADD CONSTRAINT "booking_line_items_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bookable_bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
