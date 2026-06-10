-- Personal Tasks (quick-capture inbox for staff)
-- Idempotent — safe if db push already created these.

DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" "TaskPriority",
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "maintenanceRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tasks_maintenanceRequestId_key" ON "tasks"("maintenanceRequestId");
CREATE INDEX IF NOT EXISTS "tasks_createdById_completedAt_idx" ON "tasks"("createdById", "completedAt");
CREATE INDEX IF NOT EXISTS "tasks_assignedToId_completedAt_idx" ON "tasks"("assignedToId", "completedAt");

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_maintenanceRequestId_fkey"
    FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
