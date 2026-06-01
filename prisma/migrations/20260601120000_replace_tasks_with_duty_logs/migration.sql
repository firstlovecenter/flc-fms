-- Drop Task Board (safe if already removed via db push)
DROP TABLE IF EXISTS "tasks";
DROP TYPE IF EXISTS "TaskStatus";

-- Duty log enums (idempotent — db push may have created these already)
DO $$ BEGIN
  CREATE TYPE "DutyTemplateType" AS ENUM ('TIMED_LOG', 'END_OF_SHIFT', 'CHECKLIST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DutyTimeType" AS ENUM ('SPECIFIC', 'END_OF_DAY', 'CONTINUOUS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DutyLogStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'SIGNED_OFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "duty_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DutyTemplateType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duty_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "duty_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "timeType" "DutyTimeType" NOT NULL DEFAULT 'SPECIFIC',
    "scheduledTime" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "duty_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "duty_logs" (
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

CREATE TABLE IF NOT EXISTS "duty_log_items" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "duty_logs_templateId_date_assignedToId_key" ON "duty_logs"("templateId", "date", "assignedToId");
CREATE INDEX IF NOT EXISTS "duty_logs_date_idx" ON "duty_logs"("date");
CREATE INDEX IF NOT EXISTS "duty_logs_assignedToId_idx" ON "duty_logs"("assignedToId");
CREATE INDEX IF NOT EXISTS "duty_template_items_templateId_sortOrder_idx" ON "duty_template_items"("templateId", "sortOrder");
CREATE INDEX IF NOT EXISTS "duty_log_items_dutyLogId_sortOrder_idx" ON "duty_log_items"("dutyLogId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "duty_template_items" ADD CONSTRAINT "duty_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "duty_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "duty_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "duty_logs" ADD CONSTRAINT "duty_logs_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "duty_log_items" ADD CONSTRAINT "duty_log_items_dutyLogId_fkey" FOREIGN KEY ("dutyLogId") REFERENCES "duty_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "duty_log_items" ADD CONSTRAINT "duty_log_items_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
