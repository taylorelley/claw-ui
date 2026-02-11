/*
  # Core Schema for Adaptive A2UI Agent Interface

  1. New Tables
    - `agent_connections`
      - `id` (uuid, primary key)
      - `name` (text) - Display name for the agent/gateway
      - `gateway_url` (text) - WebSocket endpoint URL
      - `auth_token` (text, nullable) - Optional authentication token
      - `is_default` (boolean) - Whether this is the default connection
      - `status` (text) - Connection status: connected, disconnected, error
      - `metadata` (jsonb) - Extra configuration data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `sessions`
      - `id` (uuid, primary key)
      - `agent_connection_id` (uuid, FK) - Which agent this session belongs to
      - `title` (text) - Auto-generated or user-edited session title
      - `is_pinned` (boolean) - Whether session is pinned to dashboard
      - `metadata` (jsonb) - Extra session data (surface states, etc.)
      - `created_at` (timestamptz)
      - `last_active_at` (timestamptz)

    - `messages`
      - `id` (uuid, primary key)
      - `session_id` (uuid, FK) - Parent session
      - `role` (text) - 'user' or 'agent'
      - `content` (text) - Plain text content
      - `a2ui_payload` (jsonb, nullable) - Full A2UI surface state
      - `metadata` (jsonb) - Additional message data
      - `created_at` (timestamptz)

    - `interaction_events`
      - `id` (uuid, primary key)
      - `session_id` (uuid, FK, nullable)
      - `event_type` (text) - Type of interaction
      - `event_data` (jsonb) - Detailed event payload
      - `created_at` (timestamptz)

    - `user_preferences`
      - `id` (uuid, primary key)
      - `preference_key` (text, unique) - Preference identifier
      - `preference_value` (jsonb) - The preference data
      - `updated_at` (timestamptz)

    - `shortcuts`
      - `id` (uuid, primary key)
      - `label` (text) - Display label
      - `command_template` (text) - Command to execute
      - `icon_name` (text, nullable) - Lucide icon name
      - `usage_count` (integer) - Times used
      - `display_order` (integer) - Sort order
      - `is_system` (boolean) - System-generated vs user-created
      - `last_used_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add anon read/write policies for single-user local mode
*/

-- Agent Connections
CREATE TABLE IF NOT EXISTS agent_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  gateway_url text NOT NULL,
  auth_token text,
  is_default boolean DEFAULT false,
  status text NOT NULL DEFAULT 'disconnected',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to agent_connections"
  ON agent_connections FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert agent_connections"
  ON agent_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update agent_connections"
  ON agent_connections FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete agent_connections"
  ON agent_connections FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow anon read agent_connections"
  ON agent_connections FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert agent_connections"
  ON agent_connections FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update agent_connections"
  ON agent_connections FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete agent_connections"
  ON agent_connections FOR DELETE TO anon
  USING (true);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_connection_id uuid REFERENCES agent_connections(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New Session',
  is_pinned boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to sessions"
  ON sessions FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete sessions"
  ON sessions FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow anon read sessions"
  ON sessions FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert sessions"
  ON sessions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update sessions"
  ON sessions FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete sessions"
  ON sessions FOR DELETE TO anon
  USING (true);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  a2ui_payload jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to messages"
  ON messages FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update messages"
  ON messages FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete messages"
  ON messages FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow anon read messages"
  ON messages FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert messages"
  ON messages FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update messages"
  ON messages FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete messages"
  ON messages FOR DELETE TO anon
  USING (true);

-- Interaction Events
CREATE TABLE IF NOT EXISTS interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to interaction_events"
  ON interaction_events FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert interaction_events"
  ON interaction_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete interaction_events"
  ON interaction_events FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow anon read interaction_events"
  ON interaction_events FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert interaction_events"
  ON interaction_events FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon delete interaction_events"
  ON interaction_events FOR DELETE TO anon
  USING (true);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_key text UNIQUE NOT NULL,
  preference_value jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to user_preferences"
  ON user_preferences FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert user_preferences"
  ON user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update user_preferences"
  ON user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete user_preferences"
  ON user_preferences FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow anon read user_preferences"
  ON user_preferences FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert user_preferences"
  ON user_preferences FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update user_preferences"
  ON user_preferences FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete user_preferences"
  ON user_preferences FOR DELETE TO anon
  USING (true);

-- Shortcuts
CREATE TABLE IF NOT EXISTS shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  command_template text NOT NULL,
  icon_name text,
  usage_count integer DEFAULT 0,
  display_order integer DEFAULT 0,
  is_system boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to shortcuts"
  ON shortcuts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert shortcuts"
  ON shortcuts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update shortcuts"
  ON shortcuts FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete shortcuts"
  ON shortcuts FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow anon read shortcuts"
  ON shortcuts FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert shortcuts"
  ON shortcuts FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update shortcuts"
  ON shortcuts FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete shortcuts"
  ON shortcuts FOR DELETE TO anon
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_connection ON sessions(agent_connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_events_type ON interaction_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_events_session ON interaction_events(session_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_order ON shortcuts(display_order);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);