/*
  # Auth improvements

  1. Changes
    - Remove password column from users table as it's handled by auth.users
    - Add RLS policy for users to update their own data
    - Add storage bucket for message images
*/

-- Remove password column as it's handled by auth.users
ALTER TABLE users DROP COLUMN password;

-- Allow users to update their own data
CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create storage bucket for message images
INSERT INTO storage.buckets (id, name)
VALUES ('message-images', 'message-images')
ON CONFLICT DO NOTHING;

-- Set up storage policy
CREATE POLICY "Users can upload their own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );