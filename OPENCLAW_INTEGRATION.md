# OpenClaw Channel Plugin Integration

This document describes how to integrate claw-ui with OpenClaw using the `claw-ui` channel plugin.

## Architecture

The claw-ui application can run in two modes:

1. **Standalone mode** (original) - Connects to OpenClaw Gateway via WebSocket
2. **Channel plugin mode** (new) - Served and managed by the OpenClaw channel plugin

### Channel Plugin Mode (Recommended)

In this mode, the `claw-ui` channel plugin:
- Serves the built React app as static files
- Provides a WebSocket endpoint at `/ws` for bidirectional communication
- Routes messages to/from the OpenClaw agent system
- Handles authentication with a configurable token

## Setup

### 1. Build the claw-ui Application

```bash
cd claw-ui
npm install
npm run build
```

The built files will be in the `dist/` directory.

### 2. Install the Channel Plugin

The plugin should be located at:
```
/root/.openclaw/workspace/extensions/claw-ui/
```

Install dependencies:
```bash
cd /root/.openclaw/workspace/extensions/claw-ui
npm install
```

### 3. Configure OpenClaw

Add to your OpenClaw config (e.g., `~/.openclaw/config.yaml`):

```yaml
channels:
  claw-ui:
    enabled: true
    port: 18800
    staticDir: /path/to/claw-ui/dist
    auth:
      mode: token
      token: your-secret-token-here

plugins:
  entries:
    claw-ui:
      path: /root/.openclaw/workspace/extensions/claw-ui
      enabled: true
```

### 4. Configure claw-ui Environment

For **production** builds (served by the plugin), create `.env.production`:

```bash
# Use same-origin WebSocket endpoint
VITE_CLAW_WS_URL=

# Auth token (must match OpenClaw config)
VITE_CLAW_AUTH_TOKEN=your-secret-token-here

# Supabase config (optional, for session persistence)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For **development** (Vite dev server connecting to plugin), create `.env.development`:

```bash
# Connect to plugin WebSocket
VITE_CLAW_WS_URL=ws://localhost:18800/ws

# Auth token (must match OpenClaw config)
VITE_CLAW_AUTH_TOKEN=your-secret-token-here
```

### 5. Build and Deploy

**For production:**
```bash
npm run build
# Copy dist/ to the staticDir configured in OpenClaw
```

**For development:**
```bash
# Terminal 1: Start OpenClaw with the plugin
openclaw gateway start

# Terminal 2: Start Vite dev server
npm run dev
```

### 6. Access the UI

- **Production:** http://localhost:18800
- **Development:** http://localhost:5173 (Vite dev server)

## WebSocket Protocol

The plugin uses a simple JSON protocol:

### Client → Server

**Authentication:**
```json
{
  "type": "auth",
  "token": "your-secret-token"
}
```

**Send message:**
```json
{
  "type": "message",
  "content": "Hello, agent!"
}
```

### Server → Client

**Authentication success:**
```json
{
  "type": "auth_ok"
}
```

**Authentication failed:**
```json
{
  "type": "auth_error",
  "message": "Invalid token"
}
```

**Agent message:**
```json
{
  "type": "message",
  "content": "Response from agent",
  "role": "assistant"
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Error description"
}
```

## Development Workflow

### Working on the UI

1. Start OpenClaw with the plugin enabled (serves the API):
   ```bash
   openclaw gateway start
   ```

2. Start Vite dev server (hot reload for UI changes):
   ```bash
   npm run dev
   ```

3. The Vite dev server will connect to the plugin's WebSocket at `ws://localhost:18800/ws`

### Working on the Plugin

1. Make changes to the plugin code in `/root/.openclaw/workspace/extensions/claw-ui/`

2. Restart OpenClaw:
   ```bash
   openclaw gateway restart
   ```

3. Test with either the production build or the Vite dev server

## Troubleshooting

### WebSocket Connection Failed

- Verify the plugin is running: Check OpenClaw logs
- Verify the port is correct: Default is 18800
- Verify the auth token matches between `.env` and OpenClaw config
- Check firewall rules if accessing remotely

### Authentication Failed

- Ensure `VITE_CLAW_AUTH_TOKEN` matches `channels.claw-ui.auth.token` in OpenClaw config
- Token is case-sensitive
- If using `auth.mode: none`, the token can be empty/omitted

### Static Files Not Serving

- Verify `staticDir` points to the correct `dist/` directory
- Ensure you've run `npm run build` in the claw-ui directory
- Check OpenClaw logs for file serving errors

### Messages Not Appearing

- Check browser console for WebSocket errors
- Verify the `useClawChannel` hook is connected (status should be 'connected')
- Check OpenClaw logs for message routing issues

## Migration from Gateway Mode

If you're migrating from the original Gateway WebSocket mode:

1. The `useGateway` hook has been replaced with `useClawChannel`
2. The protocol is simpler (no RPC, no A2UI support yet)
3. Gateway-specific features (multi-agent connections, agent config page) may need updates
4. Session management now happens primarily in the UI (Supabase)

## Future Enhancements

- [ ] Support for streaming responses (stream_start, stream_chunk, stream_end)
- [ ] Support for A2UI (adaptive UI components)
- [ ] Message editing and deletion
- [ ] Reaction support
- [ ] Thread/topic support
- [ ] File uploads
- [ ] Multi-user authentication
