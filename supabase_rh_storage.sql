-- Creates the storage bucket for human resources (RH) documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('RH', 'RH', true)
ON CONFLICT (id) DO NOTHING;

-- Provide full access to RH bucket
CREATE POLICY "Public Read RH" ON storage.objects FOR SELECT USING ( bucket_id = 'RH' );
CREATE POLICY "Public Upload RH" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'RH' );
CREATE POLICY "Public Update RH" ON storage.objects FOR UPDATE USING ( bucket_id = 'RH' );
CREATE POLICY "Public Delete RH" ON storage.objects FOR DELETE USING ( bucket_id = 'RH' );
