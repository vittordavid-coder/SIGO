-- Creates the storage bucket for equipment photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('equipamentos', 'equipamentos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'equipamentos' );

-- Allow public insert access (since the app uses custom auth or anon key)
CREATE POLICY "Public Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'equipamentos' );

-- Allow public update access
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'equipamentos' );

-- Allow public delete access
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'equipamentos' );
