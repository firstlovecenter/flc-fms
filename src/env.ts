import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated environment variables.
 * Import `env` instead of `process.env` in server code to get
 * type-safe access and a clear build-time error if a required var is missing.
 *
 * Client-side vars must be prefixed with NEXT_PUBLIC_ and declared in `client`.
 */
export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

    // Auth
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    ENCRYPTION_KEY: z
      .string()
      .length(64, "ENCRYPTION_KEY must be exactly 64 hex characters (32-byte AES-256 key)"),

    // Redis
    REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),

    // FLC Notify (all outbound channels: SMS, email)
    FLC_NOTIFY_URL: z.string().url().optional(),
    FLC_NOTIFY_KEY: z.string().optional(),
    FLC_NOTIFY_SENDER_ID: z.string().optional(),
    EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email address"),

    // Push Notifications (VAPID web-push)
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),

    // Cron
    CRON_SECRET: z.string().optional(),

    // Node environment
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
    NEXT_PUBLIC_VAPID_KEY: z.string().optional(),
  },
  /**
   * Destructure `process.env` here so Next.js can statically replace it at build time.
   * All vars must be listed explicitly — no spread operators.
   */
  runtimeEnv: {
    DATABASE_URL:          process.env.DATABASE_URL,
    JWT_SECRET:            process.env.JWT_SECRET,
    ENCRYPTION_KEY:        process.env.ENCRYPTION_KEY,
    REDIS_URL:             process.env.REDIS_URL,
    FLC_NOTIFY_URL:        process.env.FLC_NOTIFY_URL,
    FLC_NOTIFY_KEY:        process.env.FLC_NOTIFY_KEY,
    FLC_NOTIFY_SENDER_ID:  process.env.FLC_NOTIFY_SENDER_ID,
    EMAIL_FROM:            process.env.EMAIL_FROM,
    VAPID_PUBLIC_KEY:      process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY:     process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT:         process.env.VAPID_SUBJECT,
    CRON_SECRET:           process.env.CRON_SECRET,
    NODE_ENV:              process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL:   process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_VAPID_KEY: process.env.NEXT_PUBLIC_VAPID_KEY,
  },
  // Skip validation in tests or CI if env vars aren't available
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
