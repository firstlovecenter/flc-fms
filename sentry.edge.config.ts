import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  // Lower sample rate for edge — these are high-frequency
  tracesSampleRate: 0.05,
});
