-- Patch to add equipment_maintenance table
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id TEXT PRIMARY KEY,
  equipment_id TEXT REFERENCES controller_equipments(id) ON DELETE CASCADE,
  company_id TEXT,
  entry_date DATE NOT NULL,
  exit_date DATE,
  type TEXT, -- 'preventive' or 'corrective'
  requested_items TEXT,
  duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (consistent with other tables in this app)
DROP POLICY IF EXISTS "Allow public access" ON equipment_maintenance;
CREATE POLICY "Allow public access" ON equipment_maintenance FOR ALL USING (true) WITH CHECK (true);
