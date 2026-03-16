-- Per-venue optional AC usage fee
ALTER TABLE "facilities"
ADD COLUMN "acUsageFee" DECIMAL(10, 2) NOT NULL DEFAULT 0;
