/*
  # Enable real-time messaging

  1. Changes
    - Enable real-time for messages table
    - Create publication for real-time changes
    - Add policies for real-time access
*/

-- Enable real-time for messages table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Create or update publication for real-time
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Update existing publication
    ALTER PUBLICATION supabase_realtime SET TABLE messages;
  ELSE
    -- Create new publication
    CREATE PUBLICATION supabase_realtime FOR TABLE messages;
  END IF;
END $$;

-- Add policy for real-time access
CREATE POLICY "Enable real-time for users' messages" ON messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid()
    )
  );