/*
  # Fix message deletion function

  1. Changes
    - Update delete_message function to use explicit table aliases
    - Clarify ambiguous user_id references
    - Add better error handling
*/

-- Drop existing function
DROP FUNCTION IF EXISTS delete_message;

-- Recreate function with fixed column references
CREATE OR REPLACE FUNCTION delete_message(
  message_id UUID,
  user_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user can delete the message (owner or group admin)
  IF NOT EXISTS (
    SELECT 1 FROM messages m
    LEFT JOIN group_members gm ON m.group_id = gm.group_id AND gm.user_id = $2
    WHERE m.id = $1
    AND (
      m.sender_id = $2
      OR (
        m.group_id IS NOT NULL
        AND gm.is_admin = true
      )
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this message';
  END IF;

  -- Soft delete the message
  UPDATE messages
  SET is_deleted = true
  WHERE id = $1;

  RETURN true;
END;
$$;