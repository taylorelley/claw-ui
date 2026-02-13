#!/usr/bin/env node
/**
 * Run migration 003 via Supabase service role key
 * This creates a PostgreSQL function and uses it to run DDL
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabasekong-xsgcss44okcgsokg0ssoscwc.app.taylorelley.com';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDg2NzY2MCwiZXhwIjo0OTI2NTQxMjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cAWEYVARBgOGkOIyGaHd6hBNGZFluuKS270jI02kisw';

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
  console.log('UPDATE agent_tokens SET token_secret = \'3YIWhFRdb0ww5sD7VQbfQ2U0C5IZHU4sx5awbv4f-dY\' WHERE id = \'0420cbd7-1521-4635-9fb4-83733e9b042b\';\n');
  
  console.log('❌ Cannot apply migration via API');
  console.log('✅ Solution: SSH to Coolify server and run:');
  console.log('   docker exec -i $(docker ps --filter "name=supabase.*db" --format "{{.Names}}" | head -1) \\');
  console.log('     psql -U postgres -d postgres < /path/to/003_add_token_secret.sql');
  process.exit(1);
}

addColumn().catch(console.error);
