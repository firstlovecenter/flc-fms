import "server-only";
import Redis from "ioredis";
import { requestScoped } from "@/lib/runtime/request-scope";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createClient(): Redis {
  const url = process.env.REDIS_URL;
  const client = new Redis(url ?? "redis://localhost:6379", {
    maxRetriesPerRequest: url ? 3 : 0,
    enableReadyCheck: false,
    // Don't keep retrying when no Redis URL is configured
    lazyConnect: !url,
  });
  // Prevent unhandled 'error' events from crashing the process;
  // all callers already have try/catch fallbacks.
  client.on("error", () => {});
  return client;
}

function sharedClient(): Redis {
  globalForRedis.redis ??= createClient();
  return globalForRedis.redis;
}

/**
 * One connection per request on Cloudflare Workers (whose sockets cannot cross
 * requests), one shared connection everywhere else.
 */
export const redis: Redis = requestScoped(createClient, sharedClient);

/** Sliding-window rate limiter. Returns true if the request is allowed. */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Date.now();
    const window = now - windowSeconds * 1000;
    const redisKey = `rl:${key}`;

    const pipe = redis.pipeline();
    pipe.zremrangebyscore(redisKey, "-inf", window);
    pipe.zadd(redisKey, now, `${now}-${Math.random()}`);
    pipe.zcard(redisKey);
    pipe.expire(redisKey, windowSeconds);

    const results = await pipe.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count)};
  } catch {
    // Degrade gracefully when Redis is unavailable so auth flows continue to work.
    return {
      allowed: true,
      remaining: limit,
    };
  }
}
