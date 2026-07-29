-- Migration to link service compositions to specific contracts
-- Run this script in your Supabase SQL Editor to update your schema.

ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS contract_id TEXT;
