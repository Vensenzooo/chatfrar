/*
  # Enable real-time for messages

  1. Enable real-time for messages table
  2. Add publication for real-time changes
*/

-- Enable real-time for messages table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Create publication for real-time changes
CREATE PUBLICATION supabase_realtime FOR TABLE messages;