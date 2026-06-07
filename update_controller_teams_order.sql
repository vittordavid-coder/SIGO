-- Migration to add display_order to controller_teams
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='controller_teams' AND column_name='display_order') THEN
        ALTER TABLE controller_teams ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
END $$;
