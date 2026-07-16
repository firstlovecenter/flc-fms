-- Unify staff and patron identities in the users table.
-- Matching emails become one dual-context account; patron-only identities keep
-- their existing IDs so booking references remain stable.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" GROUP BY LOWER(TRIM("email")) HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Cannot unify accounts: users contains duplicate emails with different casing.';
  END IF;
  IF EXISTS (SELECT 1 FROM "patrons" GROUP BY LOWER(TRIM("email")) HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Cannot unify accounts: patrons contains duplicate emails with different casing.';
  END IF;
END $$;

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PATRON';
ALTER TABLE "users" ADD COLUMN "isPatron" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TEMP TABLE "patron_account_map" (
  "patronId" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "patron_account_map" ("patronId", "accountId")
SELECT p."id", COALESCE(u."id", p."id")
FROM "patrons" p
LEFT JOIN "users" u ON LOWER(u."email") = LOWER(p."email");

-- Existing staff accounts with a matching patron email become dual accounts.
UPDATE "users" u
SET
  "isPatron" = true,
  "isVerified" = u."isVerified" OR p."isVerified",
  "phone" = COALESCE(u."phone", p."phone"),
  "profilePicture" = COALESCE(u."profilePicture", p."profilePicture")
FROM "patrons" p
WHERE LOWER(u."email") = LOWER(p."email");

-- Patron-only identities become PATRON user accounts and retain credentials.
INSERT INTO "users" (
  "id", "email", "passwordHash", "name", "phone", "role", "isActive",
  "permissions", "mustChangePassword", "profilePicture", "isPatron",
  "isVerified", "createdAt", "updatedAt"
)
SELECT
  p."id", p."email", p."passwordHash", p."name", p."phone", 'PATRON'::"Role", true,
  '{}'::jsonb, false, p."profilePicture", true, p."isVerified",
  p."createdAt", p."updatedAt"
FROM "patrons" p
WHERE NOT EXISTS (
  SELECT 1 FROM "users" u WHERE LOWER(u."email") = LOWER(p."email")
);

ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_patronId_fkey";

UPDATE "bookings" b
SET "patronId" = m."accountId"
FROM "patron_account_map" m
WHERE b."patronId" = m."patronId";

UPDATE "push_subscriptions" ps
SET "patronId" = m."accountId"
FROM "patron_account_map" m
WHERE ps."patronId" = m."patronId";

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_patronId_fkey"
FOREIGN KEY ("patronId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "patrons";

UPDATE "users" SET "email" = LOWER(TRIM("email"));

CREATE INDEX "users_isPatron_isActive_idx" ON "users"("isPatron", "isActive");
CREATE UNIQUE INDEX "users_email_lower_key" ON "users"(LOWER("email"));
