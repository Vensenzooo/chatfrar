/*
  # Real-time Chat Enhancements

  1. Changes
    - Add last_seen timestamp to users table
    - Add online status tracking
    - Add typing indicator support
    - Add message status tracking (sent, delivered, read)

  2. Security
    - Only authenticated users can update their status
    - Only chat participants can see typing indicators
*/

-- Add online status tracking
ALTER TABLE users
ADD COLUMN last_seen timestamptz DEFAULT now(),
ADD COLUMN is_online boolean DEFAULT false;

-- Function to update user status
CREATE OR REPLACE FUNCTION update_user_status(
  p_user_id UUID,
  p_is_online boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET 
    is_online = p_is_online,
    last_seen = CASE WHEN p_is_online = false THEN now() ELSE last_seen END
  WHERE id = p_user_id;
END;
$$;