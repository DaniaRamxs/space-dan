-- Create the uploads bucket for chat images
-- Run this in Supabase SQL Editor

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

-- Set up RLS policies for the uploads bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Allow public access to view
CREATE POLICY "Allow public access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'uploads');

-- Allow users to delete their own files
CREATE POLICY "Allow owners to delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND owner = auth.uid());
