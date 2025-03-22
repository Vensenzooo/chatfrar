/*
  # Create stored procedure for group creation
  
  Creates a function to handle group creation and member addition in a single transaction
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
  result jsonb;
BEGIN
  -- Create the group
  INSERT INTO groups (name, created_by)
  VALUES (group_name, creator_id)
  RETURNING id INTO new_group_id;
  
  -- Add members
  INSERT INTO group_members (group_id, user_id)
  SELECT new_group_id, unnest(member_ids);
  
  -- Return the created group with members
  SELECT jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'created_by', g.created_by,
    'created_at', g.created_at,
    'members', jsonb_agg(jsonb_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'avatar', u.avatar
    ))
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