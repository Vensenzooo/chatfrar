/*
  # Fix storage policies
  
  1. Changes
    - Drop existing policies
    - Create new policies with correct bucket name and permissions
    - Add policy for authenticated users to upload files
    - Add policy for public access to files
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload media files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for media files" ON storage.objects;

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-files', 'media-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "authenticated users can upload media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media-files'
);

-- Allow authenticated users to update their own files
CREATE POLICY "authenticated users can update own media files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media-files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'media-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "authenticated users can delete own media files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public access to read files
CREATE POLICY "public can read media files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media-files');