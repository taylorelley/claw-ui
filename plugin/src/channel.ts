/**
 * Claw UI Channel Plugin Implementation
 * 
 * Follows official OpenClaw channel plugin architecture:
 * - Required: id, meta, capabilities, config
 * - Optional: outbound, gateway, status, security, etc.
 * 
 * Reference: /docs/tools/plugin.md "Write a new messaging channel"
 */

import type {
  ChannelPlugin,
  ChannelConfigAdapter,
  ChannelOutboundAdapter,
  ChannelGatewayAdapter,
  ChannelStatusAdapter,
  ChannelSecurityAdapter,
  ChannelMeta,
  ChannelCapabilities,
  ChannelAccountSnapshot,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import { getClawUIRuntime } from "./runtime.js";
import { CloudClient } from "./cloudClient.js";

// ============================================================================
// Types
// ============================================================================

interface ClawUIAccountConfig {
  enabled?: boolean;
  mode?: "local" | "cloud";
  port?: number;
  relayUrl?: string;
  tokenId?: string;
  tokenSecret?: string;
  name?: string;
}

interface ResolvedClawUIAccount {
  accountId: string;
  name?: string;
  enabled: boolean;
  config: ClawUIAccountConfig;
  tokenSource: "config" | "env" | "none";
}

interface ClawUIAccountState {
  accountId: string;
  running: boolean;
  lastStartAt: string | null;
  lastStopAt: string | null;
  lastError: string | null;
  mode?: string | null;
}

// ============================================================================
// State
// ============================================================================

// Active cloud clients by account ID
const cloudClients = new Map<string, CloudClient>();

// ============================================================================
// Config Helpers
// ============================================================================

/**
 * Resolve account from config or environment variables
 * Follows standard pattern: config.accounts.<id> > config top-level > env vars
 */
function resolveClawUIAccount(
  cfg: OpenClawConfig,
  accountId?: string | null
): ResolvedClawUIAccount {
  const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
  const channelConfig = (cfg.channels as Record<string, unknown>)?.["claw-ui"] as ClawUIAccountConfig | undefined;
  
  // Check for account-based config first
  const accounts = (channelConfig as Record<string, unknown>)?.accounts as Record<string, ClawUIAccountConfig> | undefined;
  const accountConfig = accounts?.[resolvedAccountId];
  
  // Environment variable fallbacks
  const envTokenId = process.env.CLAW_UI_TOKEN_ID;
  const envTokenSecret = process.env.CLAW_UI_TOKEN;
  const envRelayUrl = process.env.CLAW_UI_RELAY_URL;
  const envMode = process.env.CLAW_UI_MODE as "local" | "cloud" | undefined;

  // Account-level config
  if (accountConfig) {
    return {
      accountId: resolvedAccountId,
      name: accountConfig.name,
      enabled: accountConfig.enabled !== false,
      config: {
        enabled: accountConfig.enabled,
        mode: accountConfig.mode ?? "cloud",
        port: accountConfig.port,
        relayUrl: accountConfig.relayUrl,
        tokenId: accountConfig.tokenId,
        tokenSecret: accountConfig.tokenSecret,
      },
      tokenSource: accountConfig.tokenId ? "config" : "none",
    };
  }
  
  // Top-level channel config
  if (channelConfig) {
    return {
      accountId: resolvedAccountId,
      enabled: channelConfig.enabled !== false,
      config: {
        enabled: channelConfig.enabled,
        mode: channelConfig.mode ?? envMode ?? "cloud",
        port: channelConfig.port,
        relayUrl: channelConfig.relayUrl ?? envRelayUrl,
        tokenId: channelConfig.tokenId ?? envTokenId,
        tokenSecret: channelConfig.tokenSecret ?? envTokenSecret,
      },
      tokenSource: channelConfig.tokenId ? "config" : envTokenId ? "env" : "none",
    };
  }
  
  // Environment-only config
  if (envTokenId && envTokenSecret) {
    return {
      accountId: resolvedAccountId,
      enabled: true,
      config: {
        enabled: true,
        mode: envMode ?? "cloud",
        relayUrl: envRelayUrl ?? "wss://claw-ui.app.taylorelley.com/relay/agent",
        tokenId: envTokenId,
        tokenSecret: envTokenSecret,
      },
      tokenSource: "env",
    };
  }
  
  // Not configured
  return {
    accountId: resolvedAccountId,
    enabled: false,
    config: {},
    tokenSource: "none",
  };
}

/**
 * List all configured account IDs
 */
function listClawUIAccountIds(cfg: OpenClawConfig): string[] {
  const channelConfig = (cfg.channels as Record<string, unknown>)?.["claw-ui"];
  const accounts = (channelConfig as Record<string, unknown>)?.accounts;
  
  if (accounts && typeof accounts === "object") {
    return Object.keys(accounts);
  }
  
  // Check for top-level or env config (implies default account)
  const hasTopLevel = (channelConfig as ClawUIAccountConfig)?.tokenId || 
                      (channelConfig as ClawUIAccountConfig)?.enabled;
  const hasEnv = process.env.CLAW_UI_TOKEN_ID && process.env.CLAW_UI_TOKEN;
  
  if (hasTopLevel || hasEnv) {
    return [DEFAULT_ACCOUNT_ID];
  }
  
  return [];
}

// ============================================================================
// Channel Meta (Step 2 from docs)
// ============================================================================

const meta: ChannelMeta = {
  id: "claw-ui",
  label: "Claw UI",
  selectionLabel: "Claw UI (Web)",
  docsPath: "/channels/claw-ui",
  blurb: "Web chat interface for OpenClaw",
  aliases: ["clawui", "webui", "web"],
};

// ============================================================================
// Capabilities
// ============================================================================

const capabilities: ChannelCapabilities = {
  chatTypes: ["direct"],
  reactions: false,
  threads: false,
  media: true,
  nativeCommands: true,
};

// ============================================================================
// Config Adapter (Step 3 from docs - Required)
// ============================================================================

const configAdapter: ChannelConfigAdapter<ResolvedClawUIAccount> = {
  listAccountIds: (cfg) => listClawUIAccountIds(cfg),
  
  resolveAccount: (cfg, accountId) => resolveClawUIAccount(cfg, accountId),
  
  defaultAccountId: () => DEFAULT_ACCOUNT_ID,
  
  isConfigured: (account) => {
    return account.config.mode === "local" || 
           Boolean(account.config.tokenId && account.config.tokenSecret);
  },
  
  describeAccount: (account): ChannelAccountSnapshot => ({
    accountId: account.accountId,
    name: account.name,
    enabled: account.enabled,
    configured: account.config.mode === "local" || Boolean(account.config.tokenId),
    tokenSource: account.tokenSource,
  }),
};

// ============================================================================
// Security Adapter (Optional)
// ============================================================================

const securityAdapter: ChannelSecurityAdapter<ResolvedClawUIAccount> = {
  resolveDmPolicy: ({ account }) => ({
    policy: "open" as const, // Web UI handles its own auth via tokens
    configPath: `channels.claw-ui`,
  }),
};

// ============================================================================
// Outbound Adapter (Step 3 from docs)
// ============================================================================

const outboundAdapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  textChunkLimit: 4000,
  
  sendText: async ({ to, text, accountId }) => {
    const client = cloudClients.get(accountId ?? DEFAULT_ACCOUNT_ID);
    if (!client) {
      return { ok: false, error: "Channel not connected" };
    }
    
    try {
      await client.sendToClient(to, {
        type: "message",
        content: text,
      });
      return { ok: true, channel: "claw-ui" };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  },
  
  sendMedia: async ({ to, text, mediaUrl, accountId }) => {
    const client = cloudClients.get(accountId ?? DEFAULT_ACCOUNT_ID);
    if (!client) {
      return { ok: false, error: "Channel not connected" };
    }
    
    try {
      await client.sendToClient(to, {
        type: "message",
        content: text,
        media: mediaUrl,
      });
      return { ok: true, channel: "claw-ui" };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  },
};

// ============================================================================
// Status Adapter (Optional - for health/diagnostics)
// ============================================================================

const statusAdapter: ChannelStatusAdapter<ResolvedClawUIAccount, unknown, unknown> = {
  defaultRuntime: {
    accountId: DEFAULT_ACCOUNT_ID,
    running: false,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null,
  } as ClawUIAccountState,
  
  buildAccountSnapshot: ({ account, runtime }) => ({
    accountId: account.accountId,
    name: account.name,
    enabled: account.enabled,
    configured: Boolean(account.config.tokenId) || account.config.mode === "local",
    tokenSource: account.tokenSource,
    running: (runtime as ClawUIAccountState)?.running ?? false,
    mode: account.config.mode ?? "cloud",
    lastStartAt: (runtime as ClawUIAccountState)?.lastStartAt ?? null,
    lastStopAt: (runtime as ClawUIAccountState)?.lastStopAt ?? null,
    lastError: (runtime as ClawUIAccountState)?.lastError ?? null,
  }),
};

// ============================================================================
// Gateway Adapter (Step 4 from docs - for start/stop)
// ============================================================================

const gatewayAdapter: ChannelGatewayAdapter<ResolvedClawUIAccount> = {
  /**
   * Start the channel for an account
   * Called by OpenClaw gateway when starting channels
   */
  startAccount: async (ctx) => {
    const { account, cfg, runtime, abortSignal, log } = ctx;
    const accountId = account.accountId;
    
    log?.info?.(`[${accountId}] starting claw-ui channel`);
    
    // Local mode: WebSocket server (not implemented)
    if (account.config.mode === "local") {
      log?.info?.(`[${accountId}] local mode not yet implemented`);
      return;
    }
    
    // Cloud mode: connect to relay
    const relayUrl = account.config.relayUrl;
    const tokenId = account.config.tokenId;
    const tokenSecret = account.config.tokenSecret;
    
    if (!relayUrl || !tokenId || !tokenSecret) {
      log?.error?.(`[${accountId}] missing relay credentials (relayUrl, tokenId, tokenSecret)`);
      return;
    }
    
    log?.info?.(`[${accountId}] connecting to relay: ${relayUrl}`);
    
    // Create cloud client
    const client = new CloudClient({
      relayUrl,
      tokenId,
      tokenSecret,
      accountId,
      runtime: getClawUIRuntime(),
      onMessage: async (senderId, message) => {
        // Inbound messages will be routed through OpenClaw's standard flow
        log?.debug?.(`[${accountId}] received message from ${senderId}`);
      },
    });
    
    cloudClients.set(accountId, client);
    
    try {
      await client.connect();
      log?.info?.(`[${accountId}] connected to relay server`);
    } catch (err) {
      log?.error?.(`[${accountId}] failed to connect: ${err}`);
      cloudClients.delete(accountId);
      throw err;
    }
    
    // Handle abort signal for cleanup
    abortSignal?.addEventListener("abort", () => {
      log?.info?.(`[${accountId}] stopping claw-ui channel (abort signal)`);
      client.disconnect();
      cloudClients.delete(accountId);
    });
  },
  
  /**
   * Stop the channel for an account
   */
  stopAccount: async (ctx) => {
    const { account, log } = ctx;
    const accountId = account.accountId;
    
    log?.info?.(`[${accountId}] stopping claw-ui channel`);
    
    const client = cloudClients.get(accountId);
    if (client) {
      client.disconnect();
      cloudClients.delete(accountId);
    }
  },
};

// ============================================================================
// Channel Plugin Export
// ============================================================================

/**
 * The complete claw-ui channel plugin
 * Conforms to ChannelPlugin<ResolvedClawUIAccount>
 */
export const clawUIPlugin: ChannelPlugin<ResolvedClawUIAccount, unknown, unknown> = {
  id: "claw-ui",
  meta,
  capabilities,
  config: configAdapter,
  security: securityAdapter,
  outbound: outboundAdapter,
  status: statusAdapter,
  gateway: gatewayAdapter,
  
  // JSON Schema for channel config validation
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", default: true },
      mode: { 
        type: "string", 
        enum: ["local", "cloud"], 
        default: "cloud",
        description: "local = WebSocket server, cloud = connect to relay",
      },
      port: { 
        type: "number", 
        description: "Port for local mode WebSocket server",
      },
      relayUrl: { 
        type: "string", 
        description: "WebSocket URL for cloud relay",
      },
      tokenId: { 
        type: "string", 
        description: "Token ID for cloud authentication",
      },
      tokenSecret: { 
        type: "string", 
        description: "Token secret (or use CLAW_UI_TOKEN env var)",
      },
      accounts: {
        type: "object",
        description: "Multi-account configuration",
        additionalProperties: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            name: { type: "string" },
            mode: { type: "string", enum: ["local", "cloud"] },
            relayUrl: { type: "string" },
            tokenId: { type: "string" },
            tokenSecret: { type: "string" },
          },
        },
      },
    },
  },
};
