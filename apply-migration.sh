#!/bin/bash
# Apply multi-tenant migration to Supabase

# Connection details (from Coolify)
# DB_PASSWORD must be set in the environment (e.g., via Coolify secrets or .env file)
if [ -z "$DB_PASSWORD" ]; then
  echo "Error: DB_PASSWORD environment variable is not set."
  echo "Set it via your secrets manager or export it before running this script."
  exit 1
fi
DB_HOST="${DB_HOST:-supabase-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"

# Try to apply via Docker exec
echo "Applying migration 20260212101500_multi_tenant.sql..."
export PGPASSWORD="$DB_PASSWORD"
if docker exec -i -e PGPASSWORD="$DB_PASSWORD" $(docker ps --filter "name=supabase-db" --format "{{.Names}}" | head -1) \
  psql -U "$DB_USER" -d "$DB_NAME" < supabase/migrations/20260212101500_multi_tenant.sql; then
  echo "Migration applied!"
else
  echo "Error: Migration failed. Check the output above for details."
  exit 1
fi
