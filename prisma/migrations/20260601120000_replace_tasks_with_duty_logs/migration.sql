-- Drop Task Board
DROP TABLE IF EXISTS "tasks";
DROP TYPE IF EXISTS "TaskStatus";

-- Duty log enums
CREATE TYPE "DutyTemplateType" AS ENUM ('TIMED_LOG', 'END_OF_SHIFT', 'CHECKLIST');
CREATE TYPE "DutyTimeType" AS ENUM ('SPECIFIC', 'END_OF_DAY', 'CONTINUOUS');
CREATE TYPE "DutyLogStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'SIGNED_OFF');

CREATE TABLE "duty_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DutyTemplateType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duty_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "duty_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "timeType" "DutyTimeType" NOT NULL DEFAULT 'SPECIFIC',
    "scheduledTime" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "duty_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "duty_logs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "DutyLogStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigneeSignedAt" TIMESTAMP(3),
    "supervisorId" TEXT,
    "supervisorSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duty_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "duty_log_items" (
    "id" TEXT NOT NULL,
    "dutyLogId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "timeType" "DutyTimeType" NOT NULL DEFAULT 'SPECIFIC',
    "scheduledTime" TEXT,
    "description" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "signedById" TEXT,

    CONSTRAINT "duty_log_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "duty_logs_templateId_date_assignedToId_key" ON "duty_logs"("templateId", "date", "assignedToId");
CREATE INDEX "duty_logs_date_idx" ON "duty_logs"("date");
CREATE INDEX "duty_logs_assignedToId_idx" ON "duty_logs"("assignedToId");
CREATE INDEX "duty_template_items_templateId_sortOrder_idx" ON "duty_template_items"("templateId", "sortOrder");
CREATE INDEX "duty_log_items_dutyLogId_sortOrder_idx" ON "duty_log_items"("dutyLogId", "sortOrder");

ALTER TABLE "duty_template_items" ADD CONSTRAINT "duty_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "duty_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "duty_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "duty_log_items" ADD CONSTRAINT "duty_log_items_dutyLogId_fkey" FOREIGN KEY ("dutyLogId") REFERENCES "duty_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "duty_log_items" ADD CONSTRAINT "duty_log_items_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
