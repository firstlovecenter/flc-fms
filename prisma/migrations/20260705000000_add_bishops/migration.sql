-- CreateTable
CREATE TABLE "bishops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bishops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bishops_isActive_sortOrder_idx" ON "bishops"("isActive", "sortOrder");
