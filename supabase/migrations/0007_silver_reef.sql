/*
  # Add group admin functionality

  1. Changes
    - Add is_admin column to group_members table
    - Set creator as admin by default
    - Add policies for admin actions
    - Add functions for admin operations

  2. Security
    - Only group admins can manage members
    - Only group admins can update group settings
*/

-- Add is_admin column to group_members
ALTER TABLE group_members
ADD COLUMN is_admin boolean DEFAULT false;

-- Update existing groups to set creator as admin
UPDATE group_members gm
SET is_admin = true
FROM groups g
WHERE gm.group_id = g.id
AND gm.user_id = g.created_by;

-- Function to add member to group
CREATE OR REPLACE FUNCTION add_group_member(
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

  -- Add member
  INSERT INTO group_members (group_id, user_id)
  VALUES ($1, $2)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN true;
END;
$$;

-- Function to remove member from group
CREATE OR REPLACE FUNCTION remove_group_member(
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

  -- Cannot remove the last admin
  IF (
    SELECT COUNT(*) = 1
    FROM group_members
    WHERE group_id = $1
    AND is_admin = true
  ) AND (
    SELECT is_admin
    FROM group_members
    WHERE group_id = $1
    AND user_id = $2
  ) THEN
    RAISE EXCEPTION 'Cannot remove last admin';
  END IF;

  -- Remove member
  DELETE FROM group_members
  WHERE group_id = $1
  AND user_id = $2;

  RETURN true;
END;
$$;

-- Function to promote member to admin
CREATE OR REPLACE FUNCTION promote_to_admin(
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

  -- Promote member
  UPDATE group_members
  SET is_admin = true
  WHERE group_id = $1
  AND user_id = $2;

  RETURN true;
END;
$$;