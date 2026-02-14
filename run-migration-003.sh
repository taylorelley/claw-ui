#!/bin/bash
# Run migration 003 to add token_secret column

SUPABASE_URL="${SUPABASE_URL:-https://supabasekong-xsgcss44okcgsokg0ssoscwc.app.taylorelley.com}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDg2NzY2MCwiZXhwIjo0OTI2NTQxMjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cAWEYVARBgOGkOIyGaHd6hBNGZFluuKS270jI02kisw}"
DB_PASSWORD="${DB_PASSWORD:-SqpR6B86fR6Ytl5hGSIy4yD3qsnlBvjk}"

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
docker exec -i "$CONTAINER" psql -U postgres -d postgres < supabase/migrations/003_add_token_secret.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"
  
  # Update the VladsBot token with the secret
  echo "Updating VladsBot token..."
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "
    UPDATE agent_tokens 
    SET token_secret = '3YIWhFRdb0ww5sD7VQbfQ2U0C5IZHU4sx5awbv4f-dY'
    WHERE id = '0420cbd7-1521-4635-9fb4-83733e9b042b';
  "
  
  echo "✅ Token updated!"
else
  echo "❌ Migration failed"
  exit 1
fi
