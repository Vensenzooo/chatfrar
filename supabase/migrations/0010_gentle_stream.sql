/*
  # Add unread messages support
  
  1. New Tables
    - `unread_messages`
      - `user_id` (uuid, references users)
      - `sender_id` (uuid, references users)
      - `count` (integer)
      - `last_read_at` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for read/write access
*/

-- Create unread_messages table
CREATE TABLE unread_messages (
  user_id uuid REFERENCES users(id),
  sender_id uuid REFERENCES users(id),
  count integer DEFAULT 0,
  last_read_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, sender_id)
);

-- Enable RLS
ALTER TABLE unread_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own unread counts"
  ON unread_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage unread counts"
  ON unread_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to increment unread count
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle direct messages
  IF NEW.group_id IS NULL AND NEW.receiver_id IS NOT NULL THEN
    INSERT INTO unread_messages (user_id, sender_id, count)
    VALUES (NEW.receiver_id, NEW.sender_id, 1)
    ON CONFLICT (user_id, sender_id)
    DO UPDATE SET 
      count = unread_messages.count + 1,
      last_read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment unread count on new message
CREATE TRIGGER increment_unread_count_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- Function to reset unread count
CREATE OR REPLACE FUNCTION reset_unread_count(p_user_id uuid, p_sender_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE unread_messages
  SET count = 0, last_read_at = NOW()
  WHERE user_id = p_user_id AND sender_id = p_sender_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;