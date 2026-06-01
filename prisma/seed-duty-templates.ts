import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding duty log templates...");

  const morningTemplate = await prisma.dutyTemplate.upsert({
    where: { id: "duty-template-morning" },
    update: { name: "Morning Opening Duties", type: "TIMED_LOG", sortOrder: 1, isActive: true },
    create: {
      id: "duty-template-morning",
      name: "Morning Opening Duties",
      type: "TIMED_LOG",
      sortOrder: 1,
    },
  });

  const sundayTemplate = await prisma.dutyTemplate.upsert({
    where: { id: "duty-template-sunday" },
    update: { name: "Sunday Man on Duty", type: "END_OF_SHIFT", sortOrder: 2, isActive: true },
    create: {
      id: "duty-template-sunday",
      name: "Sunday Man on Duty",
      type: "END_OF_SHIFT",
      sortOrder: 2,
    },
  });

  const cleaningTemplate = await prisma.dutyTemplate.upsert({
    where: { id: "duty-template-cleaning" },
    update: {
      name: "Facilities & Cleaning Checklist",
      type: "CHECKLIST",
      sortOrder: 3,
      isActive: true,
    },
    create: {
      id: "duty-template-cleaning",
      name: "Facilities & Cleaning Checklist",
      type: "CHECKLIST",
      sortOrder: 3,
    },
  });

  await prisma.dutyTemplateItem.deleteMany({
    where: {
      templateId: {
        in: [morningTemplate.id, sundayTemplate.id, cleaningTemplate.id],
      },
    },
  });

  await prisma.dutyTemplateItem.createMany({
    data: [
      { templateId: morningTemplate.id, sortOrder: 1, timeType: "SPECIFIC", scheduledTime: "06:00", description: "Open main gate" },
      { templateId: morningTemplate.id, sortOrder: 2, timeType: "SPECIFIC", scheduledTime: "06:00", description: "Open mood-changing gate" },
      { templateId: morningTemplate.id, sortOrder: 3, timeType: "SPECIFIC", scheduledTime: "06:00", description: "Open auditorium" },
      { templateId: morningTemplate.id, sortOrder: 4, timeType: "SPECIFIC", scheduledTime: "07:00", description: "Check and record ECG levels" },
      { templateId: morningTemplate.id, sortOrder: 5, timeType: "SPECIFIC", scheduledTime: "07:00", description: "Check water levels" },
      { templateId: morningTemplate.id, sortOrder: 6, timeType: "SPECIFIC", scheduledTime: "07:00", description: "Inspect washroom cleanliness" },
      { templateId: morningTemplate.id, sortOrder: 7, timeType: "SPECIFIC", scheduledTime: "07:00", description: "Ensure water is flowing in washrooms" },
      { templateId: morningTemplate.id, sortOrder: 8, timeType: "SPECIFIC", scheduledTime: "07:00", description: "Check tissue, hand towel, and soap availability" },
      { templateId: sundayTemplate.id, sortOrder: 1, timeType: "SPECIFIC", scheduledTime: "23:00", description: "Begin compound cleaning" },
      { templateId: sundayTemplate.id, sortOrder: 2, timeType: "END_OF_DAY", scheduledTime: null, description: "Check all doors are locked" },
      { templateId: sundayTemplate.id, sortOrder: 3, timeType: "CONTINUOUS", scheduledTime: null, description: "Attend to emergencies" },
      { templateId: sundayTemplate.id, sortOrder: 4, timeType: "END_OF_DAY", scheduledTime: null, description: "Sign out" },
      { templateId: cleaningTemplate.id, sortOrder: 1, timeType: "SPECIFIC", scheduledTime: null, description: "Sweep Revival Street" },
      { templateId: cleaningTemplate.id, sortOrder: 2, timeType: "SPECIFIC", scheduledTime: null, description: "Sweep Rock Gardens" },
      { templateId: cleaningTemplate.id, sortOrder: 3, timeType: "SPECIFIC", scheduledTime: null, description: "Sweep Engedi Chapel" },
      { templateId: cleaningTemplate.id, sortOrder: 4, timeType: "SPECIFIC", scheduledTime: null, description: "Remove bins from Rock Gardens, Revival Street, and Engedi" },
      { templateId: cleaningTemplate.id, sortOrder: 5, timeType: "SPECIFIC", scheduledTime: null, description: "Buy fuel for generator" },
    ],
  });

  const counts = await Promise.all([
    prisma.dutyTemplateItem.count({ where: { templateId: morningTemplate.id } }),
    prisma.dutyTemplateItem.count({ where: { templateId: sundayTemplate.id } }),
    prisma.dutyTemplateItem.count({ where: { templateId: cleaningTemplate.id } }),
  ]);

  console.log("Done.");
  console.log(`  • ${morningTemplate.name}: ${counts[0]} tasks`);
  console.log(`  • ${sundayTemplate.name}: ${counts[1]} tasks`);
  console.log(`  • ${cleaningTemplate.name}: ${counts[2]} tasks`);
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
