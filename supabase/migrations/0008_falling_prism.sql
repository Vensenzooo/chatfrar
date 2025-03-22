/*
  # Add media support
  
  1. Changes
    - Create new media_files bucket with public access
    - Add policies for media file uploads and access
    - Support for images and audio files
*/

-- Create media_files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-files', 'media-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload media files
CREATE POLICY "Authenticated users can upload media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media-files' AND
  (
    LOWER(SUBSTRING(name FROM '\.([^\.]+)$')) IN (
      -- Images
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      -- Audio
      'mp3', 'wav', 'ogg', 'm4a'
    )
  )
);

-- Allow public access to read media files
CREATE POLICY "Public read access for media files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media-files');