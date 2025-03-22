/*
  # Add group bans and management features
  
  1. New Tables
    - `group_bans` to track banned users
  
  2. Changes
    - Add ban/unban functions
    - Update message policies to prevent banned users from sending messages
    - Add function to check if user is banned
*/

-- Create group_bans table
CREATE TABLE group_bans (
  group_id uuid REFERENCES groups(id),
  user_id uuid REFERENCES users(id),
  banned_by uuid REFERENCES users(id),
  banned_at timestamptz DEFAULT now(),
  reason text,
  PRIMARY KEY (group_id, user_id)
);

-- Enable RLS
ALTER TABLE group_bans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Group admins can manage bans"
  ON group_bans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_bans.group_id
      AND user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Function to ban user from group
CREATE OR REPLACE FUNCTION ban_group_member(
  group_id UUID,
  member_id UUID,
  admin_id UUID,
  ban_reason TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = $1
    AND user_id = $3
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Cannot ban another admin
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = $1
    AND user_id = $2
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Cannot ban an admin';
  END IF;

  -- Remove from group members
  DELETE FROM group_members
  WHERE group_id = $1
  AND user_id = $2;

  -- Add to banned users
  INSERT INTO group_bans (group_id, user_id, banned_by, reason)
  VALUES ($1, $2, $3, $4);

  RETURN true;
END;
$$;

-- Function to unban user from group
CREATE OR REPLACE FUNCTION unban_group_member(
  group_id UUID,
  member_id UUID,
  admin_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = $1
    AND user_id = $3
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Remove from banned users
  DELETE FROM group_bans
  WHERE group_id = $1
  AND user_id = $2;

  RETURN true;
END;
$$;

-- Function to check if user is banned from group
CREATE OR REPLACE FUNCTION is_user_banned_from_group(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_bans
    WHERE group_id = p_group_id
    AND user_id = p_user_id
  );
END;
$$;

-- Update message sending policy to check for bans
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      group_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM group_bans
        WHERE group_id = messages.group_id
        AND user_id = auth.uid()
      )
    )
  );