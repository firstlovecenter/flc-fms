/** @type {import('next').NextConfig} */

const productionSecurityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.paystack.co",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: *.cloudfront.net cdn.sanity.io",
      "connect-src 'self' *.paystack.co api.paystack.co bms.codeslaw.dev",
      "frame-src *.paystack.co",
    ].join("; "),
  },
];

const developmentSecurityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig = {
  async headers() {
    const headers =
      process.env.NODE_ENV === "production"
        ? productionSecurityHeaders
        : developmentSecurityHeaders;

    return [{ source: "/(.*)", headers }];
  },
  experimental: {
    // Next.js does NOT support wildcard patterns in allowedOrigins.
    // List every trusted origin explicitly. Add your deployed domains here.
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "localhost:3002",
        "127.0.0.1:3000",
        "127.0.0.1:3001",
        "127.0.0.1:3002",
        "admin.platform.com",
        "accra.platform.com",
        "kumasi.platform.com",
        // Add additional campus subdomains as they are created.
        ...(process.env.EXTRA_ALLOWED_ORIGINS
          ? process.env.EXTRA_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
          : []),
      ],
    },
  },
};

export default nextConfig;
