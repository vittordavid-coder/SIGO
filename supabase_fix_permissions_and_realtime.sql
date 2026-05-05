-- Run this in Supabase SQL Editor
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_contract_ids TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_modules TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS desired_modules TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_quotation_ids TEXT[] DEFAULT '{}';

-- Enable Realtime for all tables so clients receive updates immediately
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_state;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
    ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add table to realtime publication.';
END $$;
