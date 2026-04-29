-- Performance indexes: reduce N+1 query costs on hot paths

-- Booking: compound index for availability queries (facilityId + status + deletedAt)
CREATE INDEX IF NOT EXISTS "bookings_facilityId_status_deletedAt_idx"
  ON "bookings"("facilityId", "status", "deletedAt");

-- BookingLineItem: indexes for aggregate queries by itemId/bundleId in countBookedItemQuantity
CREATE INDEX IF NOT EXISTS "booking_line_items_bundleId_idx"
  ON "booking_line_items"("bundleId");

CREATE INDEX IF NOT EXISTS "booking_line_items_itemId_idx"
  ON "booking_line_items"("itemId");

-- BundleComponent: index for looking up bundles that contain a given item
CREATE INDEX IF NOT EXISTS "bundle_components_itemId_idx"
  ON "bundle_components"("itemId");

-- User: compound index for staff-notification queries (role + isActive)
CREATE INDEX IF NOT EXISTS "users_role_isActive_idx"
  ON "users"("role", "isActive");

-- Income: compound index for report queries with date range + soft-delete filter
CREATE INDEX IF NOT EXISTS "income_receivedAt_deletedAt_idx"
  ON "income"("receivedAt", "deletedAt");
