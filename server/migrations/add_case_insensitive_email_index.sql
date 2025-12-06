-- Add case-insensitive unique index on email to prevent duplicate users
-- This ensures that user@gmail.com and User@gmail.com are treated as the same

-- First, normalize any existing emails to lowercase
UPDATE users SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));

-- Create unique index on lowercase email
CREATE UNIQUE INDEX IF NOT EXISTS users_lower_email_idx 
ON users (LOWER(email));

-- Add comment for documentation
COMMENT ON INDEX users_lower_email_idx IS 'Case-insensitive unique constraint on email to prevent duplicate Google OAuth users';
