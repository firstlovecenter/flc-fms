-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'CHECKED_OUT', 'UNDER_MAINTENANCE', 'DISPOSED', 'LOST');

-- DropForeignKey
ALTER TABLE "maintenance_requests" DROP CONSTRAINT "maintenance_requests_facilityId_fkey";

-- AlterTable
ALTER TABLE "maintenance_requests" ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "scheduledStart" TIMESTAMP(3),
ALTER COLUMN "facilityId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "inventory_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'GOOD',
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3),
    "supplier" TEXT,
    "warrantyExp" TIMESTAMP(3),
    "notes" TEXT,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_checkouts" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "checkedOutById" TEXT NOT NULL,
    "returnedById" TEXT,
    "purpose" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "locationNote" TEXT,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueBack" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "conditionOut" "InventoryCondition" NOT NULL DEFAULT 'GOOD',
    "conditionIn" "InventoryCondition",
    "notes" TEXT,

    CONSTRAINT "inventory_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_maintenance" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_assetTag_key" ON "inventory_items"("assetTag");

-- CreateIndex
CREATE INDEX "inventory_items_status_isActive_idx" ON "inventory_items"("status", "isActive");

-- CreateIndex
CREATE INDEX "inventory_checkouts_itemId_idx" ON "inventory_checkouts"("itemId");

-- CreateIndex
CREATE INDEX "inventory_checkouts_checkedOutById_idx" ON "inventory_checkouts"("checkedOutById");

-- CreateIndex
CREATE INDEX "inventory_maintenance_status_priority_idx" ON "inventory_maintenance"("status", "priority");

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "inventory_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checkouts" ADD CONSTRAINT "inventory_checkouts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checkouts" ADD CONSTRAINT "inventory_checkouts_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checkouts" ADD CONSTRAINT "inventory_checkouts_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_maintenance" ADD CONSTRAINT "inventory_maintenance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_maintenance" ADD CONSTRAINT "inventory_maintenance_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_maintenance" ADD CONSTRAINT "inventory_maintenance_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
