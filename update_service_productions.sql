-- Adds team_id to service_productions for linking technical room controls to teams

DO $$ 
BEGIN
    -- Check if column exists before adding to prevent errors on multiple runs
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_productions' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE service_productions ADD COLUMN team_id TEXT;
        -- Optional: Add foreign key if we want strict referential integrity
        -- ALTER TABLE service_productions ADD CONSTRAINT fk_sp_team FOREIGN KEY (team_id) REFERENCES controller_teams(id) ON DELETE SET NULL;
    END IF;
END $$;

