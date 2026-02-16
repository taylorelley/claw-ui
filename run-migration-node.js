#!/usr/bin/env node
/**
 * Run migration 003 via Supabase service role key
 * This creates a PostgreSQL function and uses it to run DDL
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL environment variable is required');
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

console.log('🔧 Running migration 003: Add token_secret column...\n');

// Step 1: Create a helper function using Supabase SQL editor API
async function runSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    // Function doesn't exist, try alternative approach
    return null;
  }

  return await response.json();
}

// Alternative: Use PostgREST schema reload
async function addColumn() {
  console.log('⚠️  Note: Cannot run DDL via REST API (security restriction)');
  console.log('📝 Migration SQL to run manually:\n');
  console.log('ALTER TABLE agent_tokens ADD COLUMN IF NOT EXISTS token_secret TEXT;');
  console.log('ALTER TABLE agent_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;');
  console.log('ALTER TABLE agent_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;');
  console.log('CREATE INDEX IF NOT EXISTS idx_agent_tokens_secret ON agent_tokens(token_secret) WHERE revoked_at IS NULL;\n');

  console.log('❌ Cannot apply migration via API');
  console.log('✅ Solution: SSH to Coolify server and run:');
  console.log('   docker exec -i $(docker ps --filter "name=supabase.*db" --format "{{.Names}}" | head -1) \\');
  console.log('     psql -U postgres -d postgres < /path/to/003_add_token_secret.sql');
  process.exit(1);
}

addColumn().catch(console.error);
