-- SQL Script for system_config table
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    config_key TEXT NOT NULL,
    config_value JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, config_key)
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow public access for simplicity in this project context
CREATE POLICY "Allow public access on system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);
