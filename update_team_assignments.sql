-- Update team_assignments table to remove month constraint and add history tracking

ALTER TABLE team_assignments DROP CONSTRAINT IF EXISTS team_assignments_team_id_member_id_month_key;

ALTER TABLE team_assignments 
  ALTER COLUMN month DROP NOT NULL;

ALTER TABLE team_assignments 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Migrate existing assignments to use start_date based on their month
UPDATE team_assignments 
  SET start_date = (month || '-01')::DATE
  WHERE month IS NOT NULL AND start_date IS NULL;
