-- SIGO System - Update Schema for Alojamentos (Lodging) Management
-- This script creates the alojamentos table and adds the alojamento_id column to the employees table.

-- 1. Create the Alojamentos Table
CREATE TABLE IF NOT EXISTS alojamentos (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    rooms_count INTEGER DEFAULT 0,
    max_capacity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add the alojamento_id column to the employees table (if not exists)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS alojamento_id TEXT;

-- 3. Enable RLS and create public permissive policies (consistent with existing system scripts)
ALTER TABLE alojamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access" ON alojamentos;
CREATE POLICY "Allow public access" ON alojamentos FOR ALL USING (true) WITH CHECK (true);
