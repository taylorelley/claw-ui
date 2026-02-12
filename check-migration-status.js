#!/usr/bin/env node
/**
 * Check Migration Status
 * 
 * This script checks if the multi-tenant migration has been applied to Supabase.
 * Run this after applying the migration to verify everything is set up correctly.
 * 
 * Usage:
 *   node check-migration-status.js
 * 
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 *   - Or update the constants below
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required.');
  console.error('Set it before running this script. See .env.example for details.');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('Error: SUPABASE_URL environment variable is required.');
  console.error('Set it before running this script. See .env.example for details.');
  process.exit(1);
}

async function checkMigration() {
  console.log('🔍 Checking migration status...\n');

  const checks = [
    {
      name: 'agent_tokens table exists',
      query: `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_tokens'
      )`,
    },
    {
      name: 'agent_connections has user_id column',
      query: `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'agent_connections' 
        AND column_name = 'user_id'
      )`,
    },
    {
      name: 'sessions has user_id column',
      query: `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'user_id'
      )`,
    },
    {
      name: 'user_preferences has user_id column',
      query: `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'user_id'
      )`,
    },
    {
      name: 'shortcuts has user_id column',
      query: `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'shortcuts' 
        AND column_name = 'user_id'
      )`,
    },
    {
      name: 'RLS enabled on agent_tokens',
      query: `SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'agent_tokens'`,
    },
    {
      name: 'agent_token_limit trigger exists',
      query: `SELECT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'enforce_agent_token_limit'
      )`,
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: check.query }),
      });

      if (!response.ok) {
        console.log(`❌ ${check.name}: Unable to verify (API returned ${response.status})`);
        allPassed = false;
        continue;
      }

      const result = await response.json();
      const exists = result?.exists || result?.relrowsecurity || false;
      
      if (exists) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`❌ ${check.name}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`⚠️  ${check.name}: ${error.message}`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('✅ All checks passed! Migration successfully applied.');
    console.log('\nNext steps:');
    console.log('1. Test registration at /register');
    console.log('2. Verify email confirmation works');
    console.log('3. Test RLS by trying to access another user\'s data');
  } else {
    console.log('❌ Some checks failed. Migration may not be fully applied.');
    console.log('\nPlease apply the migration using one of these methods:');
    console.log('1. Supabase Studio SQL Editor (recommended)');
    console.log('2. Docker exec into supabase-db container');
    console.log('3. psql connection to the database');
    console.log('\nSee MIGRATION_GUIDE.md for detailed instructions.');
  }
  
  console.log('='.repeat(50) + '\n');
}

// Run the check
checkMigration().catch(error => {
  console.error('Error running migration check:', error);
  console.log('\n⚠️  Could not verify migration status automatically.');
  console.log('Please check manually using Supabase Studio or psql.');
  console.log('See MIGRATION_GUIDE.md for instructions.');
  process.exit(1);
});
