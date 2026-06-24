-- SQL Script to create the `synera_financeiro` storage bucket and set policies in Supabase

INSERT INTO storage.buckets (id, name, public) 
VALUES ('synera_financeiro', 'synera_financeiro', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts when re-running
DROP POLICY IF EXISTS "synera_financeiro_public_read" ON storage.objects;
DROP POLICY IF EXISTS "synera_financeiro_auth_insert" ON storage.objects;

-- Allow public read access (since we are generating public URLs)
CREATE POLICY "synera_financeiro_public_read" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'synera_financeiro' );

-- Allow authenticated users to insert objects
CREATE POLICY "synera_financeiro_auth_insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'synera_financeiro' AND auth.role() = 'authenticated' );

-- Note: Depending on your application's setup, you might want to adjust the roles 
-- from 'authenticated' to whatever custom auth you use, or allow public inserts if not using Supabase Auth.

