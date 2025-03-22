/*
  # Enable real-time for messages

  1. Enable real-time for messages table
  2. Add messages to existing publication or create new one
*/

-- Enable real-time for messages table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Add messages table to existing publication or create new one
DO $$
BEGIN
  -- Try to add table to existing publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION
    -- If publication doesn't exist, create it
    WHEN undefined_object THEN
      CREATE PUBLICATION supabase_realtime FOR TABLE messages;
  END;
END $$;