-- ─── FacilityInventoryRequirement ────────────────────────────────────────────
-- Links a facility to the inventory items it needs when in use.
-- Quantity defaults to 1; isRequired=false means optional / nice-to-have.

CREATE TABLE "facility_inventory_requirements" (
    "id"         TEXT        NOT NULL,
    "facilityId" TEXT        NOT NULL,
    "itemId"     TEXT        NOT NULL,
    "quantity"   INTEGER     NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN     NOT NULL DEFAULT true,
    "notes"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_inventory_requirements_pkey" PRIMARY KEY ("id")
);

-- Unique: a facility can only list each item once
ALTER TABLE "facility_inventory_requirements"
    ADD CONSTRAINT "facility_inventory_requirements_facilityId_itemId_key"
    UNIQUE ("facilityId", "itemId");

-- Index on facilityId for fast look-ups by facility
CREATE INDEX "facility_inventory_requirements_facilityId_idx"
    ON "facility_inventory_requirements"("facilityId");

-- FK → facilities (cascade-delete requirements when facility is removed)
ALTER TABLE "facility_inventory_requirements"
    ADD CONSTRAINT "facility_inventory_requirements_facilityId_fkey"
    FOREIGN KEY ("facilityId")
    REFERENCES "facilities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FK → inventory_items (restrict delete: can't remove item still linked to a facility)
ALTER TABLE "facility_inventory_requirements"
    ADD CONSTRAINT "facility_inventory_requirements_itemId_fkey"
    FOREIGN KEY ("itemId")
    REFERENCES "inventory_items"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─── FacilityCheckIn ─────────────────────────────────────────────────────────
-- One record per booking tracks when an occupant checks in and checks out.
-- checkedOutAt / checkedOutById remain NULL until the occupant leaves.

CREATE TABLE "facility_check_ins" (
    "id"             TEXT         NOT NULL,
    "bookingId"      TEXT         NOT NULL,
    "checkedInById"  TEXT         NOT NULL,
    "checkedOutById" TEXT,
    "checkedInAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt"   TIMESTAMP(3),
    "notes"          TEXT,

    CONSTRAINT "facility_check_ins_pkey" PRIMARY KEY ("id")
);

-- One check-in record per booking
ALTER TABLE "facility_check_ins"
    ADD CONSTRAINT "facility_check_ins_bookingId_key"
    UNIQUE ("bookingId");

-- Index on checkedInAt for time-range queries
CREATE INDEX "facility_check_ins_checkedInAt_idx"
    ON "facility_check_ins"("checkedInAt");

-- FK → bookings (cascade-delete check-in when booking is removed)
ALTER TABLE "facility_check_ins"
    ADD CONSTRAINT "facility_check_ins_bookingId_fkey"
    FOREIGN KEY ("bookingId")
    REFERENCES "bookings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FK → users (staff member who performed the check-in)
ALTER TABLE "facility_check_ins"
    ADD CONSTRAINT "facility_check_ins_checkedInById_fkey"
    FOREIGN KEY ("checkedInById")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK → users (staff member who performed the check-out, nullable)
ALTER TABLE "facility_check_ins"
    ADD CONSTRAINT "facility_check_ins_checkedOutById_fkey"
    FOREIGN KEY ("checkedOutById")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
