-- Migration to add operation_type to station_groups table
-- This allows marking each station group as 'corte' (cutting) or 'aterro' (filling)

ALTER TABLE station_groups ADD COLUMN IF NOT EXISTS operation_type TEXT CHECK (operation_type IN ('corte', 'aterro', ''));
