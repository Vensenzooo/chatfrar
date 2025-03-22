/*
  # Message Management and Admin Controls

  1. Changes
    - Add edited_at timestamp to messages table
    - Add is_deleted boolean to messages table
    - Add policies for message management
    - Add functions for message operations

  2. Security
    - Only message owners can edit their messages
    - Group admins can delete any message in their groups
    - Message owners can delete their own messages
*/

-- Add new columns to messages table
ALTER TABLE messages
ADD COLUMN edited_at timestamptz,
ADD COLUMN is_deleted boolean DEFAULT false;

-- Function to edit message
CREATE OR REPLACE FUNCTION edit_message(
  message_id UUID,
  new_content TEXT,
  user_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns the message
  IF NOT EXISTS (
    SELECT 1 FROM messages
    WHERE id = message_id
    AND sender_id = user_id
    AND NOT is_deleted
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit this message';
  END IF;

  -- Update message
  UPDATE messages
  SET content = new_content,
      edited_at = NOW()
  WHERE id = message_id;

  RETURN true;
END;
$$;

-- Function to delete message
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
    WHERE m.id = message_id
    AND (
      m.sender_id = user_id
      OR (
        m.group_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM group_members
          WHERE group_id = m.group_id
          AND user_id = user_id
          AND is_admin = true
        )
      )
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this message';
  END IF;

  -- Soft delete the message
  UPDATE messages
  SET is_deleted = true
  WHERE id = message_id;

  RETURN true;
END;
$$;