# @taylorelley/claw-ui-plugin

Web chat interface channel plugin for OpenClaw.

## Overview

This plugin provides a web-based chat interface for OpenClaw, allowing users to interact with their agent through a browser. It follows the standard OpenClaw channel plugin architecture (similar to telegram, discord, etc.).

## Features

- **Cloud Mode**: Connect through a hosted relay server (default)
- **Local Mode**: Run a WebSocket server directly (for self-hosted setups)
- **Multi-account support**: Configure multiple instances
- **Standard channel integration**: Works with OpenClaw's message routing, tools, and features

## Installation

```bash
# Configure npm for GitHub Packages
echo "@taylorelley:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install the plugin
npm install -g @taylorelley/claw-ui-plugin
```

Or add to OpenClaw config:

```yaml
plugins:
  load:
    paths:
      - /path/to/claw-ui-plugin
```

## Configuration

### Cloud Mode (Recommended)

Add to your OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "channels": {
    "claw-ui": {
      "enabled": true,
      "mode": "cloud",
      "relayUrl": "wss://claw-ui.app.taylorelley.com/relay/agent",
      "tokenId": "your-token-id"
    }
  }
}
```

Set the token secret as an environment variable:

```bash
export CLAW_UI_TOKEN="your-token-secret"
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAW_UI_TOKEN` | Token secret for cloud authentication |
| `CLAW_UI_TOKEN_ID` | Token ID (alternative to config) |
| `CLAW_UI_RELAY_URL` | Relay WebSocket URL (alternative to config) |
| `CLAW_UI_MODE` | `local` or `cloud` (default: cloud) |

### Multi-Account Configuration

```json
{
  "channels": {
    "claw-ui": {
      "accounts": {
        "personal": {
          "enabled": true,
          "relayUrl": "wss://claw-ui.app.taylorelley.com/relay/agent",
          "tokenId": "personal-token-id"
        },
        "work": {
          "enabled": true,
          "relayUrl": "wss://claw-ui.app.taylorelley.com/relay/agent",
          "tokenId": "work-token-id"
        }
      }
    }
  }
}
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Browser   │────▶│  Relay Server   │◀────│ OpenClaw Agent  │
│   (claw-ui)     │     │   (hosted)      │     │   (plugin)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

The plugin connects to a relay server that bridges web clients with OpenClaw agents. Authentication uses HMAC-SHA256 signatures.

## Development

```bash
cd plugin

# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run dev
```

## Plugin Structure

```
plugin/
├── index.ts              # Plugin entry point
├── openclaw.plugin.json  # Plugin manifest
├── package.json
├── tsconfig.json
└── src/
    ├── channel.ts        # Channel plugin implementation
    ├── cloudClient.ts    # WebSocket client for relay
    └── runtime.ts        # Runtime access pattern
```

## Standard Compliance

This plugin follows the OpenClaw channel plugin architecture:

- ✅ Standard plugin entry format (`export default plugin`)
- ✅ Channel adapters (config, outbound, gateway, status)
- ✅ Account-based configuration
- ✅ Runtime access pattern (`getClawUIRuntime()`)
- ✅ Proper TypeScript types

## License

MIT
