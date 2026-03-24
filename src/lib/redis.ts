import "server-only";
import Redis from "ioredis";

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

export const redis = globalForRedis.redis ?? createClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

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
