# claw-ui OpenClaw Plugin

OpenClaw channel plugin for the claw-ui web interface. Enables your OpenClaw instance to communicate with the claw-ui cloud service.

## Installation

### From GitHub Packages

```bash
# Configure npm to use GitHub Packages for @taylorelley scope
echo "@taylorelley:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install the plugin
npm install -g @taylorelley/claw-ui-plugin
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/taylorelley/claw-ui.git
cd claw-ui/plugin
npm install
```

## Configuration

Add to your OpenClaw `config.yaml`:

### Cloud Mode (Recommended)

Connect to the claw-ui cloud relay:

```yaml
channels:
  claw-ui:
    enabled: true
    mode: cloud
    relayUrl: wss://claw-ui.app.taylorelley.com/relay/agent
    tokenId: "your-token-id-from-dashboard"
    # Set CLAW_UI_TOKEN environment variable with your secret token
```

Then set your token:

```bash
export CLAW_UI_TOKEN="your-secret-token-from-setup-wizard"
```

### Local Mode

Serve claw-ui locally (for development or offline use):

```yaml
channels:
  claw-ui:
    enabled: true
    mode: local
    port: 18800
    staticDir: /path/to/claw-ui/dist
    auth:
      token: your-local-token
```

## Plugin Path

After installation, add the plugin to your OpenClaw config:

```yaml
plugins:
  load:
    paths:
      - /usr/lib/node_modules/@taylorelley/claw-ui-plugin
      # Or wherever npm installed it globally
```

To find the installation path:

```bash
npm root -g
# Then append: /@taylorelley/claw-ui-plugin
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAW_UI_TOKEN` | Your secret pairing token (cloud mode) |

## Security

- Tokens are never logged or stored in plaintext
- All cloud communication uses HMAC-SHA256 signatures
- TLS required for cloud connections

## Support

- GitHub Issues: https://github.com/taylorelley/claw-ui/issues
- Documentation: https://github.com/taylorelley/claw-ui#readme
