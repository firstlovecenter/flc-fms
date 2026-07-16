-- PostgreSQL requires a newly-added enum value to be committed before it can
-- be referenced by a later statement.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PATRON';
