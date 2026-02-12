-- ============================================================================
-- FIXED MULTI-TENANT MIGRATION
-- Run this AFTER the core schema migration
-- ============================================================================

-- 1. CREATE AGENT_TOKENS TABLE
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

CREATE INDEX IF NOT EXISTS idx_agent_tokens_user_id ON agent_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tokens_hash ON agent_tokens(token_hash) WHERE revoked_at IS NULL;

ALTER TABLE agent_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent tokens" ON agent_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agent tokens" ON agent_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent tokens" ON agent_tokens FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agent tokens" ON agent_tokens FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow anon full access to agent_tokens" ON agent_tokens FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. ADD USER_ID COLUMNS TO EXISTING TABLES
ALTER TABLE agent_connections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE shortcuts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_agent_connections_user_id ON agent_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_last_active ON sessions(user_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_user_id ON shortcuts(user_id);

-- 4. DROP OLD POLICIES (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow authenticated users full access to agent_connections" ON agent_connections;
DROP POLICY IF EXISTS "Allow authenticated users to insert agent_connections" ON agent_connections;
DROP POLICY IF EXISTS "Allow authenticated users to update agent_connections" ON agent_connections;
DROP POLICY IF EXISTS "Allow authenticated users to delete agent_connections" ON agent_connections;

DROP POLICY IF EXISTS "Allow authenticated users full access to sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users to insert sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users to update sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users to delete sessions" ON sessions;

DROP POLICY IF EXISTS "Allow authenticated users full access to messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to update messages" ON messages;
DROP POLICY IF EXISTS "Allow authenticated users to delete messages" ON messages;

DROP POLICY IF EXISTS "Allow authenticated users full access to interaction_events" ON interaction_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert interaction_events" ON interaction_events;
DROP POLICY IF EXISTS "Allow authenticated users to delete interaction_events" ON interaction_events;

DROP POLICY IF EXISTS "Allow authenticated users full access to user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow authenticated users to insert user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow authenticated users to update user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow authenticated users to delete user_preferences" ON user_preferences;

DROP POLICY IF EXISTS "Allow authenticated users full access to shortcuts" ON shortcuts;
DROP POLICY IF EXISTS "Allow authenticated users to insert shortcuts" ON shortcuts;
DROP POLICY IF EXISTS "Allow authenticated users to update shortcuts" ON shortcuts;
DROP POLICY IF EXISTS "Allow authenticated users to delete shortcuts" ON shortcuts;

-- 5. CREATE NEW USER-SCOPED POLICIES

-- Agent Connections
CREATE POLICY "Users can view their own agent connections" ON agent_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agent connections" ON agent_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent connections" ON agent_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agent connections" ON agent_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sessions
CREATE POLICY "Users can view their own sessions" ON sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Messages (via session ownership)
CREATE POLICY "Users can view messages in their own sessions" ON messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can create messages in their own sessions" ON messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can update messages in their own sessions" ON messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can delete messages in their own sessions" ON messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

-- Interaction Events (via session ownership)
CREATE POLICY "Users can view events in their own sessions" ON interaction_events FOR SELECT TO authenticated
  USING (session_id IS NULL OR EXISTS (SELECT 1 FROM sessions WHERE sessions.id = interaction_events.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can create events in their own sessions" ON interaction_events FOR INSERT TO authenticated
  WITH CHECK (session_id IS NULL OR EXISTS (SELECT 1 FROM sessions WHERE sessions.id = interaction_events.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can delete events in their own sessions" ON interaction_events FOR DELETE TO authenticated
  USING (session_id IS NULL OR EXISTS (SELECT 1 FROM sessions WHERE sessions.id = interaction_events.session_id AND sessions.user_id = auth.uid()));

-- User Preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own preferences" ON user_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON user_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own preferences" ON user_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shortcuts
CREATE POLICY "Users can view their own shortcuts" ON shortcuts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own shortcuts" ON shortcuts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shortcuts" ON shortcuts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shortcuts" ON shortcuts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. AGENT TOKEN LIMIT FUNCTION
CREATE OR REPLACE FUNCTION check_agent_token_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM agent_tokens WHERE user_id = NEW.user_id AND revoked_at IS NULL) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 active agent tokens per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_agent_token_limit ON agent_tokens;
CREATE TRIGGER enforce_agent_token_limit BEFORE INSERT ON agent_tokens FOR EACH ROW EXECUTE FUNCTION check_agent_token_limit();

-- Done!
SELECT 'Multi-tenant migration complete!' as status;
