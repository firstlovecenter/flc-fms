-- Convert existing Booking Manager and Vicar users to the neutral STAFF role,
-- seeding each with the permission set of its matching preset so that no access
-- is lost. (Runs as its own migration because Postgres cannot use the STAFF enum
-- value added in the previous migration within the same transaction.)

UPDATE "users"
SET role = 'STAFF',
    permissions = '{"bookings:view":true,"bookings:create":true,"bookings:approve":true,"bookings:cancel":true,"bookings:manage_content":true,"finance:view":true,"finance:submit_expense":true,"facilities:view":true,"items:view":true,"inventory:view":true,"patrons:view":true,"checkin:perform":true,"reports:view":true,"reports:manage_subscriptions":true,"settings:manage":true,"tasks:view":true,"duty:view":true}'::jsonb
WHERE role = 'BOOKING_MANAGER';

UPDATE "users"
SET role = 'STAFF',
    permissions = '{"bookings:view":true,"bookings:create":true,"maintenance:view":true,"maintenance:create":true,"finance:submit_expense":true,"patrons:view":true,"facilities:view":true,"items:view":true,"inventory:view":true,"checkin:perform":true,"tasks:view":true,"duty:view":true}'::jsonb
WHERE role = 'VICAR';
