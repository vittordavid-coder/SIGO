-- Run this in Supabase SQL Editor
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
