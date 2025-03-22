-- Add last_read_at column to unread_messages table
ALTER TABLE unread_messages
ADD COLUMN last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have current timestamp
UPDATE unread_messages
SET last_read_at = CURRENT_TIMESTAMP
WHERE last_read_at IS NULL; 