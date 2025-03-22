/*
  # Fix group creation procedure
  
  1. Changes
    - Add ON CONFLICT DO NOTHING for group members
    - Deduplicate member IDs array
    - Add proper error handling
  
  2. Security
    - Maintain RLS policies
    - Keep SECURITY DEFINER for admin access
*/

CREATE OR REPLACE FUNCTION create_group(
  group_name TEXT,
  creator_id UUID,
  member_ids UUID[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_group_id UUID;
  unique_member_ids UUID[];
  result jsonb;
BEGIN
  -- Validate input
  IF group_name IS NULL OR creator_id IS NULL OR member_ids IS NULL THEN
    RAISE EXCEPTION 'group_name, creator_id, and member_ids are required';
  END IF;

  -- Remove duplicates from member_ids
  SELECT ARRAY(SELECT DISTINCT unnest(member_ids)) INTO unique_member_ids;
  
  -- Create the group
  INSERT INTO groups (name, created_by)
  VALUES (group_name, creator_id)
  RETURNING id INTO new_group_id;
  
  -- Add members, ignoring duplicates
  INSERT INTO group_members (group_id, user_id)
  SELECT new_group_id, unnest(unique_member_ids)
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- Return the created group with members
  SELECT jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'created_by', g.created_by,
    'created_at', g.created_at,
    'members', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', u.id,
          'username', u.username,
          'email', u.email,
          'avatar', u.avatar
        )
      ) FILTER (WHERE u.id IS NOT NULL),
      '[]'::jsonb
    )
  )
  FROM groups g
  LEFT JOIN group_members gm ON g.id = gm.group_id
  LEFT JOIN users u ON gm.user_id = u.id
  WHERE g.id = new_group_id
  GROUP BY g.id
  INTO result;
  
  RETURN result;
END;
$$;