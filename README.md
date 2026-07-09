# Church Facility Management System (CFMS)

Single-tenant facility management platform built with **Next.js 14 App Router**, **Prisma ORM**, **PostgreSQL**, and **TailwindCSS**.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
# Fill in all values — see comments in .env.example
```

### 3. Set up the database
```bash
# Run migrations
npx prisma migrate dev --name init

# Seed with test data
npm run db:seed
```

### 4. Run the dev server
```bash
npm run dev
```

---

## Single-Tenant Mode

This project now runs in single-tenant mode.
There is no tenant/campus resolution env variable required anymore.
Auth now uses a unified `/login` page for both staff and patrons.

---

## Seeded Credentials

| Role             | Email                        | Password        |
|------------------|------------------------------|-----------------|
| Super Admin      | admin@platform.com           | SuperAdmin@123  |
| Facility Manager | fm@platform.com              | FmPassword@123  |
| Vicar            | vicar@platform.com           | VicarPassword@123 |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login & register pages
│   ├── (super-admin)/   # Super Admin portal
│   ├── (campus)/        # Staff portal (route group name)
│   ├── (patron)/        # Patron portal
│   └── api/
│       ├── webhooks/    # Paystack, Flutterwave, Hubtel
│       └── payments/    # Callback handler
├── actions/             # All Server Actions
│   ├── auth.actions.ts
│   ├── booking.actions.ts
│   ├── expense.actions.ts
│   ├── facility.actions.ts
│   ├── maintenance.actions.ts
│   └── payment.actions.ts
├── lib/
│   ├── auth/            # JWT session + guards
│   ├── db/              # Prisma client
│   ├── notifications/   # SMS (BMS) + Email (Resend)
│   ├── crypto.ts        # AES-256-GCM for secrets at rest
│   ├── audit.ts         # Fire-and-forget audit logger
│   ├── redis.ts         # Redis client + rate limiter
│   └── utils.ts
└── middleware.ts        # Auth + role routing
```

---

## Optional: Sanity For Facility Content

If you want non-technical content management for facilities, use Sanity as an optional source:

1. Set env vars:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=<project-id>
NEXT_PUBLIC_SANITY_DATASET=<dataset>
```

2. Use the provided integration files:
- `src/lib/sanity/client.ts`
- `src/lib/sanity/facility.ts`
- `src/app/api/facilities/sanity/route.ts`

3. Create a `facility` document type in your Sanity Studio with fields used by the query (`name`, `description`, `pricePerHour`, `capacity`, `mainImage`).

---

## SMS Integration (FlashSMS)

The system calls the FlashSMS v2 API:

```
POST <FLASHSMS_API_URL>/sms/send
Authorization: Bearer <FLASHSMS_API_KEY>
{
  "phones": ["+233..."],
  "message": "...",
  "senderId": "CFMS"
}
```

`FLASHSMS_API_URL` must be the v2 base URL (e.g. `https://app.flashsms.africa/api/v2`) — v1 API keys are not accepted by v2 endpoints. Expected response: `202 Accepted` with `{ "data": { "id": "..." } }`.

Update `src/lib/notifications/sms.ts` if your FlashSMS endpoint differs.

---

## Payment Webhooks

Register these URLs with your payment providers:

| Provider      | Webhook URL                                      |
|---------------|--------------------------------------------------|
| Paystack      | `https://your-domain.com/api/webhooks/paystack`     |
| Flutterwave   | `https://your-domain.com/api/webhooks/flutterwave`  |
| Hubtel        | `https://your-domain.com/api/webhooks/hubtel`       |

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all env vars from `.env.example` in the Vercel dashboard.

---

## Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
