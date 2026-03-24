-- AlterTable
ALTER TABLE "facilities" ADD COLUMN "hasAccessCode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "facilities" ADD COLUMN "accessCode" TEXT;
