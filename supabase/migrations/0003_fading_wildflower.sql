/*
  # Fix authentication and RLS policies

  1. Changes
    - Add public read access to users table for searching
    - Fix user profile creation policy
    - Add missing RLS policies for profile management
    - Add policy for reading user profiles
*/

-- Allow public read access to users for searching
CREATE POLICY "Anyone can search users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can create their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Fix group members policies
DROP POLICY IF EXISTS "Members can read group members" ON group_members;
CREATE POLICY "Anyone can read group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policy for messages with groups
DROP POLICY IF EXISTS "Users can read their messages" ON messages;
CREATE POLICY "Users can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = messages.group_id
      AND user_id = auth.uid()
    )
  );