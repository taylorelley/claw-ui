# claw-ui OpenClaw Plugin

OpenClaw channel plugin for the claw-ui web interface. Supports both local and cloud relay modes.

## Features

- **Local Mode**: Runs a WebSocket server on localhost for direct browser connections
- **Cloud Mode**: Connects to a relay server for cloud-hosted deployments
- HMAC-signed authentication for cloud connections
- Auto-reconnection with exponential backoff
- Heartbeat/keepalive support

## Installation

1. Copy this directory to OpenClaw's extensions folder:
   ```bash
   cp -r claw-ui /root/.openclaw/workspace/extensions/
   ```

2. Install dependencies:
   ```bash
   cd /root/.openclaw/workspace/extensions/claw-ui
   npm install
   ```

## Configuration

### Local Mode

Use this mode for development or self-hosted deployments where the browser connects directly to OpenClaw.

```yaml
channels:
  claw-ui:
    enabled: true
    mode: local
    port: 18800
    staticDir: /path/to/claw-ui/dist
    auth:
      mode: token  # or 'none' for no auth
      token: your-secret-token
```

**Fields:**
- `mode`: Set to `"local"`
- `port`: Port to listen on (default: 18800)
- `staticDir`: Path to static files (frontend build)
- `auth.mode`: Authentication mode (`token` or `none`)
- `auth.token`: Secret token for client authentication (if mode is `token`)

### Cloud Mode

Use this mode for cloud deployments where OpenClaw connects to a relay server.

```yaml
channels:
  claw-ui:
    enabled: true
    mode: cloud
    relayUrl: wss://claw-ui.app.taylorelley.com/relay/agent
    tokenId: your-token-id-from-dashboard
    # Set CLAW_UI_TOKEN environment variable with your secret token
```

**Fields:**
- `mode`: Set to `"cloud"`
- `relayUrl`: WebSocket URL of the relay server
- `tokenId`: UUID token ID (obtained from dashboard or setup wizard)
- Token secret: **Must be set via environment variable `CLAW_UI_TOKEN`** (not in config file for security)

**Environment Variable:**
```bash
export CLAW_UI_TOKEN="your-secret-token-here"
```

## Architecture

### Local Mode

```
Browser <--WebSocket--> OpenClaw Plugin (localhost:18800)
                              ↓
                        OpenClaw Agent
```

### Cloud Mode

```
Browser <--WebSocket--> Relay Server <--WebSocket--> OpenClaw Plugin
                                                            ↓
                                                      OpenClaw Agent
```

## Security

### Local Mode
- Optional token-based authentication
- WebSocket connections over localhost
- Static file serving with SPA fallback

### Cloud Mode
- All messages are HMAC-SHA256 signed
- Token secret stored in environment variable (not config file)
- TLS validation for relay server connections
- No self-signed certificates in production

## Protocol

### Cloud Mode Message Format

**Authentication:**
```json
{
  "type": "auth",
  "tokenId": "uuid",
  "timestamp": 1234567890,
  "signature": "hmac-hex"
}
```

**Incoming Message (from relay):**
```json
{
  "type": "message",
  "sessionId": "uuid",
  "userId": "user-id",
  "content": "message text"
}
```

**Outgoing Message (to relay):**
```json
{
  "type": "message",
  "sessionId": "uuid",
  "content": "{\"type\":\"message\",\"content\":\"...\",\"role\":\"assistant\"}",
  "nonce": "uuid",
  "timestamp": 1234567890,
  "signature": "hmac-hex"
}
```

**Heartbeat:**
```json
{
  "type": "heartbeat"
}
```

## Development

### File Structure

```
claw-ui/
├── index.js              # Plugin entry point
├── package.json          # Dependencies
├── README.md             # This file
├── openclaw.plugin.json  # Plugin metadata
└── src/
    ├── channel.js        # Channel implementation (mode switching)
    ├── server.js         # Local WebSocket server
    ├── cloudClient.js    # Cloud relay client
    └── crypto.js         # HMAC signing utilities
```

### Testing

**Test Local Mode:**
```bash
# Start OpenClaw with local config
openclaw agent start

# Connect browser to localhost:18800
```

**Test Cloud Mode:**
```bash
# Set environment variable
export CLAW_UI_TOKEN="your-secret"

# Start OpenClaw with cloud config
openclaw agent start

# Check logs for connection status
```

## Troubleshooting

### Local Mode Issues

**Port already in use:**
- Change `port` in config
- Check for other processes on the port: `lsof -i :18800`

**Static files not serving:**
- Verify `staticDir` path exists
- Check file permissions

### Cloud Mode Issues

**Authentication failed:**
- Verify `CLAW_UI_TOKEN` environment variable is set
- Check `tokenId` matches dashboard/setup wizard
- Ensure token secret is correct

**Connection refused / timeout:**
- Verify `relayUrl` is correct
- Check network connectivity
- Ensure relay server is running

**Reconnection loops:**
- Check relay server logs for errors
- Verify token credentials are valid
- Check for network issues

## License

MIT
