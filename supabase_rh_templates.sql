CREATE TABLE IF NOT EXISTS rh_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  type TEXT,
  file_data TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rh_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON rh_templates FOR ALL USING (true);
