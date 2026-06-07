-- Migration to add 'color' column to controller_teams

-- Check if color column exists and add it if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='controller_teams' AND column_name='color') THEN
        ALTER TABLE controller_teams ADD COLUMN color TEXT DEFAULT '#3b82f6';
    END IF;
END $$;

-- Update existing teams that might not have a color yet (optional security step)
UPDATE controller_teams SET color = '#3b82f6' WHERE color IS NULL;

-- If you have a matching Typescript ORM or schema.ts, don't forget to add:
-- color: text('color')
