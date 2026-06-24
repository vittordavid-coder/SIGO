-- SIGO System - Add Registration Number (Matrícula) to Employees
-- This script adds the registration_number column to the employees table with a unique constraint.
-- Copy and run this script in the Supabase SQL Editor.

BEGIN;

-- 1. Add the column if it doesn't exist
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- 2. Add a unique constraint to ensure registration numbers cannot be repeated
-- In PostgreSQL, multiple NULL values are allowed under a UNIQUE constraint,
-- so employees without an assigned matricula yet will not conflict with each other.
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_registration_number_key;
ALTER TABLE public.employees ADD CONSTRAINT employees_registration_number_key UNIQUE (registration_number);

COMMIT;
