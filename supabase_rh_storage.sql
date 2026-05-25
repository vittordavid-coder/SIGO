-- Creates the storage bucket for human resources (RH) documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rh', 'rh', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Read RH" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'rh' );

-- Allow public insert access
CREATE POLICY "Public Upload RH" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'rh' );

-- Allow public update access
CREATE POLICY "Public Update RH"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'rh' );

-- Allow public delete access
CREATE POLICY "Public Delete RH"
ON storage.objects FOR DELETE
USING ( bucket_id = 'rh' );
