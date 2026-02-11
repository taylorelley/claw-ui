/*
  # Multi-Tenant Support Migration

  This migration adds multi-tenant capabilities to the claw-ui schema:
  1. Creates agent_tokens table for pairing OpenClaw plugins
  2. Adds user_id columns to all existing tables
  3. Updates RLS policies for proper user isolation
  4. Adds performance indexes
  5. Adds constraint to limit agents per user (max 10)

  Security:
  - RLS enabled on all tables
  - Authenticated users can only access their own data
  - Anonymous users can access all data (for local single-user mode)
  - Token hashes use bcrypt (implemented in application layer)
*/

-- ============================================================================
-- 1. AGENT TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_connected_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, name)
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_agent_tokens_user_id ON agent_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tokens_hash ON agent_tokens(token_hash) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE agent_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users own their tokens
CREATE POLICY "Users can view their own agent tokens"
  ON agent_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent tokens"
  ON agent_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent tokens"
  ON agent_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent tokens"
  ON agent_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anon for local mode
CREATE POLICY "Allow anon full access to agent_tokens"
  ON agent_tokens FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. ADD USER_ID TO EXISTING TABLES
-- ============================================================================

-- Add user_id to agent_connections
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_connections' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE agent_connections ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to sessions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to user_preferences
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update user_preferences unique constraint to be per-user
DO $$
BEGIN
  -- Drop the old unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_preferences_preference_key_key'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_preference_key_key;
  END IF;
  
  -- Add new unique constraint (user_id, preference_key)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_preferences_user_key_unique'
  ) THEN
    ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_key_unique 
      UNIQUE (user_id, preference_key);
  END IF;
END $$;

-- Add user_id to shortcuts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shortcuts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE shortcuts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- messages are owned via session relationship (no direct user_id needed)
-- interaction_events are owned via session relationship (no direct user_id needed)

-- ============================================================================
-- 3. UPDATE RLS POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================================

-- AGENT_CONNECTIONS: Update policies for user isolation
DROP POLICY IF EXISTS "Allow authenticated users full access to agent_connections" ON agent_connections;
DROP POLICY IF EXISTS "Allow authenticated users to insert agent_connections" ON agent_connections;
DROP POLICY IF EXISTS "Allow authenticated users to update agent_connections" ON agent_connections;
DROP POLICY IF EXISTS "Allow authenticated users to delete agent_connections" ON agent_connections;

CREATE POLICY "Users can view their own agent connections"
  ON agent_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent connections"
  ON agent_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent connections"
  ON agent_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent connections"
  ON agent_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- SESSIONS: Update policies for user isolation
DROP POLICY IF EXISTS "Allow authenticated users full access to sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users to insert sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users to update sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users to delete sessions" ON sessions;

CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- MESSAGES: Update policies - users own messages via session ownership
DROP POLICY IF EXISTS "Allow authenticated users full access to messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to update messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to delete messages" ON messages;

CREATE POLICY "Users can view messages in their own sessions"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their own sessions"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their own sessions"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their own sessions"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- INTERACTION_EVENTS: Update policies - users own events via session ownership
DROP POLICY IF EXISTS "Allow authenticated users full access to interaction_events" ON interaction_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert interaction_events" ON interaction_events;
DROP POLICY IF EXISTS "Allow authenticated users to delete interaction_events" ON interaction_events;

CREATE POLICY "Users can view events in their own sessions"
  ON interaction_events FOR SELECT
  TO authenticated
  USING (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = interaction_events.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events in their own sessions"
  ON interaction_events FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = interaction_events.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events in their own sessions"
  ON interaction_events FOR DELETE
  TO authenticated
  USING (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = interaction_events.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- USER_PREFERENCES: Update policies for user isolation
DROP POLICY IF EXISTS "Allow authenticated users full access to user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow authenticated users to insert user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow authenticated users to update user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow authenticated users to delete user_preferences" ON user_preferences;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- SHORTCUTS: Update policies for user isolation
DROP POLICY IF EXISTS "Allow authenticated users full access to shortcuts" ON shortcuts;
DROP POLICY IF EXISTS "Allow authenticated users to insert shortcuts" ON shortcuts;
DROP POLICY IF EXISTS "Allow authenticated users to update shortcuts" ON shortcuts;
DROP POLICY IF EXISTS "Allow authenticated users to delete shortcuts" ON shortcuts;

CREATE POLICY "Users can view their own shortcuts"
  ON shortcuts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shortcuts"
  ON shortcuts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shortcuts"
  ON shortcuts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shortcuts"
  ON shortcuts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_connections_user_id ON agent_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_last_active ON sessions(user_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_user_id ON shortcuts(user_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_user_order ON shortcuts(user_id, display_order);

-- ============================================================================
-- 5. CONSTRAINTS AND LIMITS
-- ============================================================================

-- Function to check agent token limit (max 10 per user)
CREATE OR REPLACE FUNCTION check_agent_token_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM agent_tokens 
    WHERE user_id = NEW.user_id 
    AND revoked_at IS NULL
  ) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 active agent tokens per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce agent token limit on insert
DROP TRIGGER IF EXISTS enforce_agent_token_limit ON agent_tokens;
CREATE TRIGGER enforce_agent_token_limit
  BEFORE INSERT ON agent_tokens
  FOR EACH ROW
  EXECUTE FUNCTION check_agent_token_limit();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to agent_connections
DROP TRIGGER IF EXISTS update_agent_connections_updated_at ON agent_connections;
CREATE TRIGGER update_agent_connections_updated_at
  BEFORE UPDATE ON agent_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
