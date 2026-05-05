-- SIGO System - Update Employees Table Schema
-- Adding missing columns status and dismissal_date

ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dismissal_date DATE;

-- Ensure RLS is active and allows full access (as per existing scripts)
-- In a real production app, you would want more restrictive policies here.
DROP POLICY IF EXISTS "Allow public access" ON employees;
CREATE POLICY "Allow public access" ON employees FOR ALL USING (true) WITH CHECK (true);
