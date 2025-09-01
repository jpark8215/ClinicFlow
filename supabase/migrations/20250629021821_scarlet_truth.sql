-- Update user_preferences table to remove marketing_emails column
ALTER TABLE user_preferences DROP COLUMN IF EXISTS marketing_emails;

-- Update the comment to reflect the simplified structure
COMMENT ON TABLE user_preferences IS 'User notification and application preferences (simplified)';