-- Migration: Add token_secret for HMAC-based auth
-- This enables the relay server to verify agent connections using HMAC signatures

-- Add token_secret column (stores plaintext secret for HMAC verification)
ALTER TABLE agent_tokens ADD COLUMN IF NOT EXISTS token_secret TEXT;

-- Add expires_at column for token expiration
ALTER TABLE agent_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add last_used_at column for tracking usage
ALTER TABLE agent_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Create index on token_secret for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_tokens_secret ON agent_tokens(token_secret) WHERE revoked_at IS NULL;
