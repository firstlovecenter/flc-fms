import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hyperdriveConnectionString, requestScoped } from "@/lib/runtime/request-scope";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof buildPrismaClient> | undefined;
};

/**
 * Prisma Client extended with a soft-delete query filter.
 *
 * For models with a `deletedAt` field (Booking, Expense, Income),
 * read operations automatically exclude soft-deleted records unless the caller
 * explicitly passes `where: { deletedAt: { not: null } }` to opt in.
 */
function buildPrismaClient() {
  // On Cloudflare Workers, connect through Hyperdrive (pooled near the database);
  // everywhere else, connect to DATABASE_URL directly.
  const connectionString = hyperdriveConnectionString() ?? process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const base = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? process.env.PRISMA_LOG_QUERIES === "true"
          ? ["query", "error", "warn"]
          : ["error", "warn"]
        : ["error"],
  });

  return base.$extends({
    query: {
      booking: {
        async $allOperations({ operation, args, query }) {
          const readOps = ["findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy"];
          if (readOps.includes(operation)) {
            const a = args as { where?: Record<string, unknown> };
            if (a.where?.deletedAt === undefined) {
              a.where = { ...a.where, deletedAt: null };
            }
          }
          return query(args);
        },
      },
      expense: {
        async $allOperations({ operation, args, query }) {
          const readOps = ["findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy"];
          if (readOps.includes(operation)) {
            const a = args as { where?: Record<string, unknown> };
            if (a.where?.deletedAt === undefined) {
              a.where = { ...a.where, deletedAt: null };
            }
          }
          return query(args);
        },
      },
      income: {
        async $allOperations({ operation, args, query }) {
          const readOps = ["findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy"];
          if (readOps.includes(operation)) {
            const a = args as { where?: Record<string, unknown> };
            if (a.where?.deletedAt === undefined) {
              a.where = { ...a.where, deletedAt: null };
            }
          }
          return query(args);
        },
      },
    },
  });
}

function sharedPrismaClient() {
  // Reused across hot reloads in development and across requests on Node.
  globalForPrisma.prisma ??= buildPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * One client per request on Cloudflare Workers (whose sockets cannot cross
 * requests), one shared client everywhere else.
 */
export const prisma = requestScoped(buildPrismaClient, sharedPrismaClient);
