#!/bin/bash
# Run migration 003 to add token_secret column

# Require credentials from environment - no hardcoded defaults
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL environment variable is required"
  exit 1
fi
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_KEY environment variable is required"
  exit 1
fi
if [ -z "$DB_PASSWORD" ]; then
  echo "❌ DB_PASSWORD environment variable is required"
  exit 1
fi

echo "Running migration 003: Add token_secret column..."

# Find the database container
CONTAINER=$(docker ps --format "{{.Names}}" | grep "supabase.*db" | head -1)

if [ -z "$CONTAINER" ]; then
  echo "❌ Could not find Supabase database container"
  echo "Available containers:"
  docker ps --format "{{.Names}}" | head -10
  exit 1
fi

echo "✅ Found container: $CONTAINER"

# Run the migration
export PGPASSWORD="$DB_PASSWORD"
docker exec -i "$CONTAINER" psql -U postgres -d postgres < supabase/migrations/20260213000000_add_token_secret.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"

  # Optionally update a specific agent token if env vars are provided
  if [ -n "$AGENT_TOKEN_SECRET" ] && [ -n "$AGENT_TOKEN_ID" ]; then
    echo "Updating agent token..."
    docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "
      UPDATE agent_tokens
      SET token_secret = '$AGENT_TOKEN_SECRET'
      WHERE id = '$AGENT_TOKEN_ID';
    "
    echo "✅ Token updated!"
  fi
else
  echo "❌ Migration failed"
  exit 1
fi
