/*
  # Fix real-time functionality

  1. Changes
    - Drop existing real-time setup
    - Create new publication with proper configuration
    - Add necessary policies for real-time access

  2. Security
    - Enable RLS for real-time access
    - Add policies to ensure users can only access their messages
*/

-- Drop existing publication if exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create new publication with proper configuration
CREATE PUBLICATION supabase_realtime FOR TABLE messages;

-- Enable replica identity for real-time
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Update real-time policy
DROP POLICY IF EXISTS "Enable real-time for users' messages" ON messages;
CREATE POLICY "Enable real-time for users' messages" ON messages
  FOR ALL TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
  );