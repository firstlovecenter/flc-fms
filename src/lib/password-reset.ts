import { redis } from "@/lib/redis";

const fallbackStore = new Map<string, { otp: string; expiresAt: number }>();

function nowMs() {
  return Date.now();
}

function getFallbackKey(email: string) {
  return `pw-reset:${email}`;
}

export async function setPasswordResetOtp(email: string, otp: string, ttlSeconds = 900) {
  const key = getFallbackKey(email);
  const expiresAt = nowMs() + ttlSeconds * 1000;

  try {
    await redis.set(key, otp, "EX", ttlSeconds);
    return;
  } catch {
    fallbackStore.set(key, { otp, expiresAt });
  }
}

export async function getPasswordResetOtp(email: string) {
  const key = getFallbackKey(email);

  try {
    const value = await redis.get(key);
    if (value) return value;
  } catch {
    // Fall back to in-memory store when Redis is unavailable
  }

  const record = fallbackStore.get(key);
  if (!record) return null;
  if (record.expiresAt <= nowMs()) {
    fallbackStore.delete(key);
    return null;
  }

  return record.otp;
}

export async function deletePasswordResetOtp(email: string) {
  const key = getFallbackKey(email);

  try {
    await redis.del(key);
  } catch {
    // Fall through and clear fallback store
  }

  fallbackStore.delete(key);
}
