# Claw UI Deployment Guide

This guide covers deploying the Claw UI system (frontend + relay server) to production.

## Architecture Overview

```
┌─────────────┐      HTTPS       ┌──────────────┐
│   Browser   │ ◄──────────────► │   Claw UI    │
│  (Client)   │                  │  (Frontend)  │
└─────────────┘                  └──────────────┘
                                        │
                                        │ WebSocket (WSS)
                                        ▼
                                 ┌──────────────┐
                                 │    Relay     │
                                 │    Server    │
                                 └──────────────┘
                                        │
                                        │ WebSocket
                                        ▼
                                 ┌──────────────┐      ┌──────────────┐
                                 │  Supabase    │      │   OpenClaw   │
                                 │    Auth      │      │    Plugin    │
                                 └──────────────┘      └──────────────┘
```

## Components

1. **Claw UI (Frontend)**: React SPA
2. **Relay Server**: WebSocket server for routing messages
3. **Supabase**: Authentication & database
4. **OpenClaw Plugin**: Connects to relay server

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (or Supabase account)
- Domain with SSL certificate
- Reverse proxy (nginx/Caddy) or platform with SSL (Coolify, Vercel, etc.)

## Deployment Options

### Option 1: Self-Hosted (Coolify/Docker)

**Best for:** Complete control, on-premise deployment

#### 1. Supabase Setup

```bash
# Using Supabase CLI (or cloud dashboard)
supabase init
supabase start

# Note the credentials:
# - Supabase URL
# - Supabase Anon Key
# - Supabase Service Role Key (keep secret!)
```

#### 2. Environment Configuration

Create `.env.production`:

```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RELAY_URL=wss://relay.yourdomain.com

# Relay Server (.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=8080
CORS_ORIGIN=https://claw-ui.yourdomain.com
```

#### 3. Build Frontend

```bash
cd /path/to/claw-ui
npm install
npm run build
# Build output: dist/
```

#### 4. Deploy with Coolify

**Frontend (Static Site):**

1. Create new application in Coolify
2. Source: GitHub repo + branch
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Environment variables: `VITE_*` from above
6. Domain: `claw-ui.yourdomain.com`
7. Enable SSL (automatic via Coolify)

**Relay Server:**

1. Create new application in Coolify
2. Source: `/tmp/claw-ui/relay-server/` directory
3. Build command: `npm install`
4. Start command: `node src/index.js`
5. Environment variables: `SUPABASE_*`, `PORT`, etc.
6. Domain: `relay.yourdomain.com`
7. Enable SSL + WebSocket support

#### 5. Database Schema

Run migrations (in Supabase dashboard or via CLI):

```sql
-- Already applied in Phase 1-4, but verify:
-- Tables: agent_tokens, sessions, messages, etc.
-- RLS policies configured
-- Auth enabled
```

### Option 2: Vercel + Railway

**Best for:** Fastest deployment, minimal config

#### Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd /path/to/claw-ui
vercel --prod

# Add environment variables in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_RELAY_URL
```

#### Relay Server (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
cd /path/to/claw-ui/relay-server
railway init
railway up

# Add environment variables in Railway dashboard
# Set custom domain for WebSocket endpoint
```

### Option 3: All-in-One Docker Compose

**Best for:** Quick local deployment or VPS

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      VITE_SUPABASE_URL: ${SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      VITE_RELAY_URL: wss://relay.yourdomain.com
    restart: unless-stopped

  relay:
    build:
      context: ./relay-server
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      PORT: 8080
      CORS_ORIGIN: https://claw-ui.yourdomain.com
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - relay
    restart: unless-stopped
```

```bash
# Deploy
docker-compose up -d
```

## Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/claw-ui

# Frontend
server {
    listen 443 ssl http2;
    server_name claw-ui.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Relay Server (WebSocket)
server {
    listen 443 ssl http2;
    server_name relay.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

## OpenClaw Plugin Configuration

On each OpenClaw instance you want to connect:

### 1. Install Plugin

```bash
# Copy plugin to OpenClaw plugins directory
cp -r /tmp/claw-ui/plugin/claw-ui-cloud ~/.openclaw/plugins/

# Or use distribution package
openclaw plugin install /path/to/claw-ui-cloud.tar.gz
```

### 2. Configure Plugin

```bash
# Set relay URL (from frontend setup wizard or manually)
openclaw config set claw-ui-cloud.relay-url "wss://relay.yourdomain.com"

# Set auth token (get from frontend Agent Management)
openclaw config set claw-ui-cloud.auth-token "eyJ..."

# Enable plugin
openclaw plugin enable claw-ui-cloud
```

### 3. Verify Connection

```bash
# Check plugin status
openclaw plugin status claw-ui-cloud

# Check logs
openclaw logs --plugin=claw-ui-cloud

# Should see: "Connected to relay server" + "Authenticated successfully"
```

## Post-Deployment Checklist

### Security

- [ ] SSL certificates configured and valid
- [ ] Supabase RLS policies enabled
- [ ] CORS origins restricted to your domain
- [ ] Service role key stored securely (not in frontend!)
- [ ] Environment variables not committed to git
- [ ] Rate limiting configured (optional but recommended)

### Functionality

- [ ] Frontend loads and displays correctly
- [ ] User registration works
- [ ] User login works
- [ ] Setup wizard generates tokens
- [ ] Relay server accepts WebSocket connections
- [ ] OpenClaw plugin connects successfully
- [ ] Messages route from browser → relay → plugin
- [ ] Agent status updates in real-time

### Performance

- [ ] Frontend assets compressed/minified
- [ ] CDN configured (optional)
- [ ] WebSocket keep-alive configured
- [ ] Database indexes created for common queries

### Monitoring

- [ ] Application logs accessible
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitoring (StatusPage, etc.)
- [ ] Database backups scheduled

## Scaling Considerations

### High Traffic

- **Frontend**: Deploy to CDN (Cloudflare, Vercel Edge)
- **Relay Server**: Horizontal scaling with load balancer
- **Database**: Supabase Pro plan or dedicated PostgreSQL cluster

### Multiple Relay Servers

For load balancing or regional distribution:

```bash
# Frontend can discover relay servers
VITE_RELAY_URLS=wss://relay-us.yourdomain.com,wss://relay-eu.yourdomain.com

# Plugin auto-selects closest/fastest
```

### Database Optimization

```sql
-- Index frequently queried columns
CREATE INDEX idx_agent_tokens_user ON agent_tokens(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_messages_session ON messages(session_id);

-- Optimize RLS policies for performance
```

## Troubleshooting

### Frontend won't load

- Check build errors: `npm run build`
- Verify environment variables set correctly
- Check browser console for errors
- Verify SSL certificate valid

### Relay server connection fails

- Check relay server logs
- Verify WebSocket upgrade headers in nginx/proxy
- Test WebSocket directly: `wscat -c wss://relay.yourdomain.com`
- Check CORS configuration

### Plugin won't connect

- Verify relay URL is correct (wss:// not ws://)
- Check auth token matches database entry
- Review OpenClaw plugin logs
- Test relay server independently

### Database errors

- Check Supabase status dashboard
- Verify service role key is correct
- Review RLS policies (might be blocking valid requests)
- Check connection limits

## Updating

### Frontend

```bash
git pull origin main
npm install
npm run build
# Deploy new dist/ to hosting
```

### Relay Server

```bash
git pull origin main
npm install
# Restart service (systemd/Docker/Coolify)
systemctl restart claw-relay  # or docker-compose restart relay
```

### Plugin

```bash
# On each OpenClaw instance
openclaw plugin update claw-ui-cloud
openclaw plugin reload claw-ui-cloud
```

## Backup & Recovery

### Database Backups

```bash
# Supabase: Automatic backups (Pro plan)
# Self-hosted: Daily pg_dump
pg_dump -U postgres claw_ui > backup-$(date +%F).sql
```

### Configuration Backups

- Export Supabase project settings
- Backup nginx configs
- Save environment variables securely (1Password, vault)

### Disaster Recovery

1. Restore database from latest backup
2. Redeploy frontend + relay from git
3. Reconfigure environment variables
4. Regenerate agent tokens if database compromised

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Coolify Docs](https://coolify.io/docs)
- [WebSocket RFC](https://tools.ietf.org/html/rfc6455)
- [OpenClaw Plugin Development](../plugin/README.md)

---

Need help? Check the main README or open an issue on GitHub.
