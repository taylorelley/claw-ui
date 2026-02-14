# Claw UI Relay Server

WebSocket relay server that routes messages between OpenClaw plugins and browser clients.

## Architecture

```
User's OpenClaw              Cloud Relay                  Browser
┌──────────────┐         ┌────────────────┐        ┌──────────┐
│ claw-ui      │────────►│ /relay/agent   │        │ React    │
│ plugin       │ WSS     │                │◄──────►│ SPA      │
└──────────────┘         │ /relay/client  │  WSS   └──────────┘
                         └────────────────┘
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Development:**
   ```bash
   npm run dev
   ```

4. **Production:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (for server-side auth)
- `SUPABASE_JWT_SECRET` - JWT secret for verifying client tokens
- `PORT` - Server port (default: 3001)

## Endpoints

### WebSocket Endpoints

- **`/relay/agent`** - For OpenClaw plugins
  - Auth via pairing token HMAC
  - Message routing to clients
  - Heartbeat support

- **`/relay/client`** - For browser clients
  - Auth via Supabase JWT
  - Message routing to agents
  - Agent status notifications

### HTTP Endpoints

- **`GET /health`** - Health check and server stats
  ```json
  {
    "status": "ok",
    "uptime": 12345,
    "stats": {
      "agents": 5,
      "clients": 10,
      "userCount": 3
    },
    "timestamp": "2026-02-12T02:00:00.000Z"
  }
  ```

## WebSocket Protocol

### Agent Messages

**Authentication:**
```json
{
  "type": "auth",
  "tokenId": "uuid",
  "signature": "hmac-sha256"
}
```

**Send message:**
```json
{
  "type": "message",
  "sessionId": "uuid",
  "content": "...",
  "nonce": "...",
  "signature": "...",
  "timestamp": 1234567890
}
```

**Heartbeat:**
```json
{
  "type": "heartbeat"
}
```

### Client Messages

**Authentication:**
```json
{
  "type": "auth",
  "jwt": "supabase-jwt",
  "agentId": "uuid"
}
```

**Send message:**
```json
{
  "type": "message",
  "content": "..."
}
```

**Ping:**
```json
{
  "type": "ping"
}
```

### Relay Responses

**Auth success:**
```json
{
  "type": "auth_ok",
  "agentId": "uuid",
  "sessionId": "uuid"
}
```

**Auth error:**
```json
{
  "type": "auth_error",
  "message": "..."
}
```

**Message:**
```json
{
  "type": "message",
  "content": "...",
  "role": "user|assistant"
}
```

**Agent status:**
```json
{
  "type": "agent_status",
  "online": true
}
```

**Error:**
```json
{
  "type": "error",
  "message": "..."
}
```

**Pong:**
```json
{
  "type": "pong"
}
```

## Security Features

- **TLS/WSS only** - Enforced by reverse proxy
- **HMAC-SHA256 signatures** - All agent messages signed
- **JWT verification** - Client auth via Supabase
- **Rate limiting** - 60 messages/min per user
- **Message size limit** - 64KB max
- **Connection timeout** - 5 min idle timeout
- **Replay protection** - Nonce + timestamp validation (±5min window)
- **User isolation** - Messages only route within same user_id

## Database Integration

The relay server interacts with these Supabase tables:

- **`agent_tokens`** - Verify token ownership and secrets
- **`agent_connections`** - Track online/offline status

Connection lifecycle:
1. Agent connects → Insert/update `agent_connections` with `connected_at`
2. Heartbeats → Update `last_seen_at`
3. Agent disconnects → Update `disconnected_at`

## Deployment

### With Coolify

The relay server can be deployed alongside the React app using Coolify:

1. **Create application** for the server
2. **Set environment variables** in Coolify dashboard
3. **Configure port** (default: 3001)
4. **Set up reverse proxy** for WSS support

### Standalone

```bash
# Build
npm run build

# Start
PORT=3001 npm start
```

## Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### WebSocket Test (Agent)
```javascript
const ws = new WebSocket('ws://localhost:3001/relay/agent');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    tokenId: 'your-token-id',
    signature: 'computed-hmac'
  }));
};
```

### WebSocket Test (Client)
```javascript
const ws = new WebSocket('ws://localhost:3001/relay/client');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    jwt: 'your-supabase-jwt',
    agentId: 'target-agent-id'
  }));
};
```

## Troubleshooting

- **Connection rejected** - Check authentication credentials
- **Rate limit exceeded** - Wait for rate limit window to reset (60 messages/min)
- **Message too large** - Reduce message size (64KB limit)
- **Connection timeout** - Send heartbeat/ping every 4 minutes
- **Invalid signature** - Verify HMAC computation and token secret

## Development

The server uses:
- **Express** - HTTP server and health checks
- **ws** - WebSocket server implementation
- **@supabase/supabase-js** - Database integration
- **jsonwebtoken** - JWT verification

File structure:
- `index.ts` - Main server entry point
- `relay.ts` - Core relay logic and connection management
- `auth.ts` - Authentication and signature verification
- `rateLimit.ts` - Rate limiting implementation
- `types.ts` - TypeScript type definitions
