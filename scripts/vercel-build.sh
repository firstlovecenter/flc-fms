#!/bin/bash
# Vercel build entrypoint. Only runs migrations against the production database on
# production builds — preview builds (branch/PR deployments) share the same
# DATABASE_URL, so running `prisma migrate deploy` there would push a migration to
# production before the PR is reviewed or merged.
set -e

npx prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  npx prisma migrate deploy
fi

npx next build
