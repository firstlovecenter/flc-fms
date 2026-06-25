-- Add a neutral STAFF role. FACILITY_MANAGER and SUPER_ADMIN remain the only
-- "real" privileged roles; everyone else is a STAFF member whose access is
-- driven entirely by their permission set.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';
