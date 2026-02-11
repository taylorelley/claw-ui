#!/bin/bash
# Apply multi-tenant migration to Supabase

# Connection details (from Coolify)
DB_PASSWORD="twiH44Zp48DeDxcZqWs1OrqXwGGhG5u4"
DB_HOST="supabase-db"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# Try to apply via Docker exec
echo "Applying migration 002_multi_tenant.sql..."
docker exec -i $(docker ps --filter "name=supabase-db" --format "{{.Names}}" | head -1) \
  psql -U $DB_USER -d $DB_NAME < supabase/migrations/002_multi_tenant.sql

echo "Migration applied!"
