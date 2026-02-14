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
 *   - DB_PASSWORD environment variable (and optionally DB_HOST, DB_PORT, DB_NAME, DB_USER)
 *   - pg package installed (npm install pg)
 */

const { Client } = require('pg');

const DB_HOST = process.env.DB_HOST || 'supabase-db';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'postgres';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('Error: DB_PASSWORD environment variable is required.');
  console.error('Set it before running this script.');
  process.exit(1);
}

async function checkMigration() {
  console.log('Checking migration status...\n');

  const client = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  await client.connect();

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
      const res = await client.query(check.query);
      const result = res.rows;

      let exists = false;
      if (Array.isArray(result) && result.length > 0) {
        const row = result[0] || {};
        exists = Boolean(row.exists || row.relrowsecurity);
      }

      if (exists) {
        console.log(`  PASS: ${check.name}`);
      } else {
        console.log(`  FAIL: ${check.name}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`  WARN: ${check.name}: ${error.message}`);
      allPassed = false;
    }
  }

  await client.end();

  console.log('\n' + '='.repeat(50));

  if (allPassed) {
    console.log('All checks passed! Migration successfully applied.');
    console.log('\nNext steps:');
    console.log('1. Test registration at /register');
    console.log('2. Verify email confirmation works');
    console.log('3. Test RLS by trying to access another user\'s data');
  } else {
    console.log('Some checks failed. Migration may not be fully applied.');
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
  console.log('\nCould not verify migration status automatically.');
  console.log('Please check manually using Supabase Studio or psql.');
  console.log('See MIGRATION_GUIDE.md for instructions.');
  process.exit(1);
});
