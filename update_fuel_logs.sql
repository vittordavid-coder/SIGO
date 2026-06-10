-- Add hour_meter column to fuel_logs
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS hour_meter NUMERIC;
