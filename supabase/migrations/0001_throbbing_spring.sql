/*
  # Initial schema for chat application

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text)
      - `email` (text, unique)
      - `password` (text)
      - `avatar` (text)
      - `created_at` (timestamptz)
    
    - `groups`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_by` (uuid, references users)
      - `created_at` (timestamptz)
    
    - `group_members`
      - `group_id` (uuid, references groups)
      - `user_id` (uuid, references users)
      - `joined_at` (timestamptz)
      - Primary key on (group_id, user_id)
    
    - `messages`
      - `id` (uuid, primary key)
      - `content` (text)
      - `image` (text)
      - `sender_id` (uuid, references users)
      - `receiver_id` (uuid, references users)
      - `group_id` (uuid, references groups)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  avatar text,
  created_at timestamptz DEFAULT now()
);

-- Groups table
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Group members table
CREATE TABLE group_members (
  group_id uuid REFERENCES groups(id),
  user_id uuid REFERENCES users(id),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  image text,
  sender_id uuid NOT NULL REFERENCES users(id),
  receiver_id uuid REFERENCES users(id),
  group_id uuid REFERENCES groups(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Groups policies
CREATE POLICY "Members can read groups"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = groups.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Group members policies
CREATE POLICY "Members can read group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can add members"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_members.group_id
      AND created_by = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());