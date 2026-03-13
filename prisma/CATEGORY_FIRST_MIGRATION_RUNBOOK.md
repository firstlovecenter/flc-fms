# Category-First Migration Runbook (Manual)

This project uses a production database. Execute this migration manually in your controlled release process.

## Artifacts
- Migration SQL: prisma/migrations/20260313193000_category_first_hard_cut/migration.sql
- Cleanup SQL: prisma/migrations/20260313224500_remove_ceremony_tables/migration.sql

## What this migration does
1. Backfills the dynamic `booking_categories` table from existing category usage.
2. Ensures each facility has an OTHER pricing row.
3. Backfills null slot categories.
4. Ensures every slot has a parent facility/category pricing record.
5. Adds booking pricing audit fields:
   - resolvedUnitPrice
   - resolvedPricingSource
6. Backfills legacy bookings with conservative values.
7. Enforces non-null slot category.
8. Adds composite FK from slot(facilityId, category) -> facility_pricing(facilityId, category).
9. Removes legacy ceremony-specific tables and the obsolete `booking_categories.isCeremony` column.

## Manual execution checklist
1. Take production backup/snapshot.
2. Run the hard-cut SQL first.
3. Run the cleanup SQL second.
4. Validate counts:
   - booking_categories contains the expected slugs
   - no null facility_time_slots.category
   - every slot has matching facility_pricing row
5. Deploy application changes.
6. Smoke test booking flows:
   - Venue -> Category -> Date/Time
   - Category -> Date -> Venue

## Notes
- No agent-side DB mutation was performed.
- This file is documentation only.
