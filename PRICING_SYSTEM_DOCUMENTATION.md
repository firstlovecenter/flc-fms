# Time-Slot Based Pricing System

## Category-First Contract (Current)

This project now uses a strict category-first model.

1. Event category is mandatory for booking.
2. Availability is category-scoped per facility.
3. Pricing is category base rate plus slot override/free behavior.
4. Category + date can drive facility discovery (only currently bookable facilities are returned).

### Canonical flow rules

1. Venue -> Category -> Date/Time (Mode A)
2. Category -> Date -> Venue -> Time (Mode B)
3. No category means no availability lookup and no booking submission.

### Pricing resolution order

1. If slot is free, charge 0.
2. Else if slot override exists, use override.
3. Else use facility-category base price.
4. Apply category free-day rules where configured.

### Data integrity rules

1. Slot category cannot be null.
2. Each slot must map to a parent facility pricing record via (facilityId, category).
3. Bookings store category and resolved pricing metadata.

## Overview
The FLC-FMS booking system now supports time-slot-specific pricing where different times of day can have different prices, free bookings on specific slots/days, and category-specific pricing overrides.

## Architecture

### Database Schema

#### FacilityTimeSlot (Extended with Pricing)
- `category?: BookingCategory` - Optional category restriction (e.g., only CHURCH_SERVICE)
- `dayOfWeek: number` - Day of week (0=Sunday, 6=Saturday)
- `startTime: string` - "HH:MM" format
- `endTime: string` - "HH:MM" format
- `label: string` - User-friendly slot name
- `isFlexible: boolean` - User can pick custom times within slot window
- `isFree: boolean` - Mark entire slot as free (no charge)
- `pricePerHourOverride?: Decimal` - Slot-specific hourly rate override
- `maxBookings: number` - Concurrent booking capacity per slot

#### FacilityPricing (Category-Based)
- `category: BookingCategory` - Event type (e.g., WEDDING, CHURCH_SERVICE)
- `pricePerHour: Decimal` - Category default rate
- `pricePerDay: Decimal` - Optional daily rate
- `freeDays: Int[]` - Days of week always free (e.g., [0, 3] = Sun & Wed)

### Pricing Resolution Logic

When a booking is created, the system resolves pricing in this order:

1. **Find Applicable Time Slot**: Match booking to a `FacilityTimeSlot` based on day/time and optional category
2. **Slot-Level Override**: 
   - If `slot.isFree = true` → charge **$0**
   - If `slot.pricePerHourOverride` is set → use that rate
   - Otherwise fall back to step 3
3. **Category-Level Default**:
   - Check `FacilityPricing` for the category
   - If `freeDays` includes booking date → charge **$0**
   - Otherwise use `pricePerHour`

### Code Implementation

#### Pricing Calculation Function
```typescript
// src/actions/booking.actions.ts
async function computeConfiguredBookingAmount(
  facilityId: string,
  category: BookingCategory,
  startTime: Date,
  endTime: Date,
): Promise<{ totalAmount: number } | { error: string }>
```

**Behavior**:
- Finds matching time slot for the booking time
- Returns 0 if slot.isFree or freeDays includes that day
- Uses slot-specific price override if configured
- Falls back to category base rate
- Multiplies by hours booked

#### Availability Query Function
```typescript
// src/actions/availability.actions.ts
async function getFacilityAvailability(
  facilityId: string,
  date: Date,
  category?: BookingCategory
): Promise<{ slots: TimeSlotAvailability[] }>
```

**Returns per slot**:
- `isFree: boolean` - Whether this slot/date is free
- `effectivePricePerHour: number` - The price that will actually be charged
- Complete availability details (current bookings, max capacity, etc.)

### UI Components

#### FacilityAvailabilityCalendar
- Shows time slots with visual pricing indicators
- Displays "✓ FREE" badge for free slots
- Shows "⚡ $XXX/hour" for paid slots
- Calculates real-time cost estimate based on selected hours
- For flexible slots, allows custom time selection within the window

#### PatronBookingForm
- Integrates calendar for time selection
- Shows category dropdown with base rates
- Displays live estimated cost
- Highlights "FREE" bookings in green
- Shows "🎉 No payment required" when booking is free

## Example Configurations

### Nathaniel Cathedral (Main Auditorium)
```
Sunday (FREE Service Times):
  08:00-11:00: Church Service, FREE, Fixed slot
  11:30-14:30: Church Service, FREE, Fixed slot

Weekday Daytime (Mon-Fri 08:00-17:00):
  Price: $400/hr, Flexible time selection

Weekday Evening (Mon-Fri 17:00-22:00):
  Price: $600/hr, Flexible time selection

Friday Evening Premium (17:00-22:00):
  Price: $700/hr (higher than weekdays), Flexible

Saturday Premium (10:00-22:00):
  Price: $800/hr (peak weekend rate), Flexible
```

### Fellowship Hall (Community Focus)
```
Sunday FREE Services:
  14:00-17:00: Fellowship Service, FREE
  18:00-21:00: Evening Service, FREE

Weekday Off-Peak (Mon-Fri 09:00-16:00):
  Price: $120/hr, Flexible (discounted rate)

Weekday Evening (Mon-Fri 16:00-22:00):
  Price: $180/hr, Flexible

Friday Evening Premium (16:00-22:00):
  Price: $220/hr, Flexible

Saturday (09:00-22:00):
  Price: $250/hr, Flexible (weekend rate)
```

## Test Cases

### Test 1: Sunday Church Service (FREE)
- Facility: Nathaniel Cathedral
- Date: Next Sunday
- Category: CHURCH_SERVICE
- Time: 08:00-11:00 (First Service slot)
- Expected Cost: **$0**
- Expected UI: Green "✓ FREE" badge

### Test 2: Friday Evening Wedding (Premium Override)
- Facility: Nathaniel Cathedral
- Date: Coming Friday
- Category: WEDDING
- Time: 18:00-22:00 (Friday Evening slot)
- Expected Cost: **700 * 4 = $2,800**
- Expected UI: "⚡ $700/hour"

### Test 3: Monday Custom Time (Weekday Override)
- Facility: Nathaniel Cathedral
- Date: Coming Monday
- Category: MEETING
- Time: 09:00-13:00 (within Weekday Daytime 08:00-17:00 slot)
- Expected Cost: **$400 * 4 = $1,600**
- Expected UI: "⚡ $400/hour" (not category default)

### Test 4: Wednesday Fellowship (Category FREE)
- Facility: Fellowship Hall
- Date: Coming Wednesday
- Category: CHURCH_SERVICE
- Time: 14:00-17:00 (Sunday Fellowship - but category free on Wed via freeDays)
- Expected Cost: **$0** (freeDays: [0, 3])
- Expected UI: Green "✓ FREE" badge

## Migration

Applied migration: `20260309190536_add_time_slot_pricing`

Fields added to `facility_time_slots` table:
- `category` (enum, nullable)
- `pricePerHourOverride` (Decimal, nullable)
- `isFree` (Boolean, default false)

## Database Seeding

Run seed to populate example pricing:
```bash
npx ts-node prisma/seed.ts
```

Seed data includes:
- ✅ 30+ time slots across 3 main facilities
- ✅ FREE Sunday church services (Nathaniel Cathedral & Fellowship Hall)
- ✅ Tiered weekday pricing (off-peak vs evening)
- ✅ Premium weekend rates
- ✅ Category-based and time-based overrides

## Future Enhancements

1. **Seasonal Pricing**: Add date ranges for holiday surcharges
2. **Dynamic Capacity**: Adjust max bookings per slot based on time/day
3. **Package Rates**: Multi-slot bookings at discounted rates
4. **Approval Overrides**: Allow managers to adjust pricing for approved bookings
5. **Pricing History**: Audit trail of pricing changes with effective dates
