/*
  # Add function to get recent chats
  
  Creates a function to retrieve recent chat contacts for a user.
  
  1. New Function
    - `get_recent_chats`: Returns list of users with whom the current user has chatted
    
  2. Details
    - Returns most recent chat partners first
    - Excludes group messages
    - Returns user details for each chat partner
*/

CREATE OR REPLACE FUNCTION get_recent_chats(user_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  avatar TEXT,
  last_message_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH chat_partners AS (
    SELECT DISTINCT
      CASE 
        WHEN sender_id = user_id THEN receiver_id
        ELSE sender_id
      END as partner_id,
      MAX(created_at) as last_message
    FROM messages
    WHERE 
      (sender_id = user_id OR receiver_id = user_id)
      AND group_id IS NULL
      AND NOT is_deleted
    GROUP BY 
      CASE 
        WHEN sender_id = user_id THEN receiver_id
        ELSE sender_id
      END
  )
  SELECT 
    u.id,
    u.username,
    u.email,
    u.avatar,
    cp.last_message as last_message_at
  FROM chat_partners cp
  JOIN users u ON u.id = cp.partner_id
  ORDER BY cp.last_message DESC;
END;
$$;