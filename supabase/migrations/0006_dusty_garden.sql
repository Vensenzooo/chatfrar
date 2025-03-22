/*
  # Create message images bucket and policies
  
  1. Changes
    - Create storage bucket for message images
    - Add policies for image upload and access
  
  2. Security
    - Only authenticated users can upload
    - Public read access for images
*/

-- Create storage bucket for message images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to read images
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'message-images');