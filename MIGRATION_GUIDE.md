# Phase 1 Migration Guide: Multi-Tenant Support

## What Was Done

### 1. Database Migration Created ✅
- Created `/supabase/migrations/002_multi_tenant.sql`
- Adds `agent_tokens` table for OpenClaw plugin pairing
- Adds `user_id` columns to all existing tables
- Updates RLS policies for proper user isolation
- Adds performance indexes
- Adds constraint limiting agents to 10 per user

### 2. Registration Page Created ✅
- Created `/src/pages/RegisterPage.tsx`
- Email + password registration form
- 12+ character password requirement
- Email validation
- No user enumeration (security)
- Email verification flow
- Links to login page

### 3. Auth Flow Updated ✅
- Updated `/src/App.tsx` to include `/register` route
- Updated `/src/pages/LoginPage.tsx` to link to registration
- Auth flow properly handles registration → email verification → login

### 4. Build Tested ✅
- `npm run build` passes successfully
- No TypeScript errors
- Production build ready

## What Needs To Be Done

### Apply the Migration to Supabase

The migration file has been created but needs to be applied to your Supabase database. Here are multiple ways to do it:

#### Option 1: Via Supabase Studio (Recommended)

1. Navigate to: https://supabasekong-skgkk080c44ow08gco8c08og.app.taylorelley.com
2. Login with admin credentials (from Coolify env vars)
3. Go to SQL Editor
4. Copy the contents of `/tmp/claw-ui/supabase/migrations/002_multi_tenant.sql`
5. Paste and run in SQL Editor
6. Verify tables and policies were created

#### Option 2: Via Docker Exec (From Coolify Server)

```bash
# SSH to your Coolify server
ssh root@<coolify-server>

# Apply migration
docker exec -i $(docker ps --filter "label=coolify.serviceName=supabase-db" --format "{{.Names}}" | head -1) \
  psql -U postgres -d postgres < /path/to/002_multi_tenant.sql
```

#### Option 3: Via psql (From Any Machine with psql)

```bash
# Get DB connection details from Coolify secrets or your secrets manager
# DB Password: <DB_PASSWORD> (retrieve from Coolify secrets or environment variable)
# DB Host: supabase-db (or localhost if port-forwarded)
# DB Port: 5432 (default)

# Apply migration
PGPASSWORD="$DB_PASSWORD" psql -h <host> -U postgres -d postgres -f supabase/migrations/002_multi_tenant.sql
```

> **Note:** Never store database passwords in documentation or source code.
> Retrieve credentials from Coolify secrets, environment variables, or your secrets manager.
> If this password was previously exposed in a commit, rotate it immediately.

### Verify Migration

After applying the migration, verify:

```sql
-- Check agent_tokens table exists
SELECT * FROM agent_tokens LIMIT 1;

-- Check user_id columns were added
SELECT user_id FROM agent_connections LIMIT 1;
SELECT user_id FROM sessions LIMIT 1;
SELECT user_id FROM user_preferences LIMIT 1;
SELECT user_id FROM shortcuts LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('agent_tokens', 'agent_connections', 'sessions', 'messages', 'user_preferences', 'shortcuts');

-- Should show true for all tables
```

### Configure Supabase Auth Settings

Ensure email verification is enabled:

1. Go to Supabase Studio → Authentication → Settings
2. Enable "Email Confirmations" under Email Auth
3. Configure SMTP settings (if not already done):
   - SMTP Host
   - SMTP Port
   - SMTP User
   - SMTP Password
   - Sender Name/Email
4. Test by registering a test account

### Update Environment Variables

For production deployment, you'll need to set Supabase connection details in the claw-ui environment:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Security Considerations

### RLS Policies Implemented ✅

**Multi-Tenant Isolation:**
- Authenticated users can ONLY access their own data
- Each user's data is completely isolated via `user_id`
- Anonymous users can access all data (for local single-user mode compatibility)

**Table-Level Security:**
- `agent_tokens`: Users own their tokens
- `agent_connections`: Users own their connections
- `sessions`: Users own their sessions
- `messages`: Users own messages via session ownership (JOIN-based policy)
- `interaction_events`: Users own events via session ownership
- `user_preferences`: Users own their preferences
- `shortcuts`: Users own their shortcuts

### Password Security ✅
- Minimum 12 characters enforced in UI and validation
- Passwords handled securely by Supabase Auth
- No plaintext storage

### User Enumeration Protection ✅
- Registration errors are normalized
- "Account exists" errors show generic message
- No difference in response time or messaging

### Token Security
- Agent tokens will be hashed with bcrypt (Phase 2)
- Max 10 active tokens per user (enforced by trigger)
- Tokens can be revoked without deletion

## Testing Checklist

Before deploying to production:

- [ ] Migration applied successfully
- [ ] RLS policies verified (try accessing another user's data - should fail)
- [ ] Registration page accessible at `/register`
- [ ] Can register new account
- [ ] Email verification sent
- [ ] Can verify email via link
- [ ] Can login after verification
- [ ] Cannot access data without authentication
- [ ] Build passes: `npm run build`
- [ ] No console errors in browser

## Next Steps (Phase 2)

Phase 1 provides the foundation. Phase 2 will implement:

1. Agent pairing workflow
2. Token generation and hashing
3. Agent management UI
4. Multi-agent session routing
5. Agent status indicators

## Troubleshobin

### Migration Fails

- **Error: "column user_id already exists"**
  - Safe to ignore - the migration uses `IF NOT EXISTS` checks
  - Or drop the column and re-run if needed

- **Error: "relation agent_tokens already exists"**
  - Safe to ignore - the migration uses `IF NOT EXISTS`

### RLS Blocks Everything

- Verify you're authenticated: `SELECT auth.uid()` should return your user ID
- Check policy definitions match the migration
- Anonymous users should still work for local mode

### Registration Not Sending Emails

- Check SMTP configuration in Supabase Studio
- Verify email confirmations are enabled
- Check Supabase logs for SMTP errors
- For testing, you can disable email confirmation (not recommended for production)

## Support

If you encounter issues:

1. Check Supabase Studio → Logs for detailed errors
2. Check browser console for frontend errors
3. Verify migration was applied: `\dt agent_tokens` in psql
4. Test RLS policies manually in SQL Editor
