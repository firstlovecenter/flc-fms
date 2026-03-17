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

    // Email (Resend)
    RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY must start with re_"),
    EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email address"),

    // SMS (BMS Gateway)
    BMS_API_URL: z.string().url().optional(),
    BMS_API_KEY: z.string().optional(),

    // Node environment
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
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
    RESEND_API_KEY:        process.env.RESEND_API_KEY,
    EMAIL_FROM:            process.env.EMAIL_FROM,
    BMS_API_URL:           process.env.BMS_API_URL,
    BMS_API_KEY:           process.env.BMS_API_KEY,
    NODE_ENV:              process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Skip validation in tests or CI if env vars aren't available
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
