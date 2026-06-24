/**
 * One-time migration: transform legacy boolean permission keys to resource-action keys.
 * Run: npx tsx prisma/scripts/migrate-permission-keys.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizeStored, permissionsToFullStored, resolvePermissions } from "../../src/lib/permissions";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Ensure .env is present in the project root.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { not: "SUPER_ADMIN" } },
    select: { id: true, role: true, permissions: true },
  });

  let updated = 0;
  for (const user of users) {
    const stored = (user.permissions as Record<string, boolean>) ?? {};
    const normalized = normalizeStored(stored);
    const resolved = resolvePermissions(user.role, normalized);
    const full = permissionsToFullStored(resolved);

    const changed = JSON.stringify(stored) !== JSON.stringify(full);
    if (changed) {
      await prisma.user.update({
        where: { id: user.id },
        data: { permissions: full },
      });
      updated++;
      console.log(`Updated ${user.id} (${user.role})`);
    }
  }

  console.log(`Done. ${updated} user(s) migrated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
