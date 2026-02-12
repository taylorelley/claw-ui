/**
 * Claw UI Channel Plugin Implementation
 * Follows standard OpenClaw channel plugin architecture
 */

import type {
  ChannelPlugin,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import { getClawUIRuntime } from "./runtime.js";
import { CloudClient } from "./cloudClient.js";

// Types for claw-ui config
interface ClawUIAccountConfig {
  enabled?: boolean;
  mode?: "local" | "cloud";
  port?: number;
  relayUrl?: string;
  tokenId?: string;
  tokenSecret?: string;
}

interface ResolvedClawUIAccount {
  accountId: string;
  name?: string;
  enabled: boolean;
  config: ClawUIAccountConfig;
  tokenSource: "config" | "env" | "none";
}

// Default account ID
const DEFAULT_ACCOUNT_ID = "default";

// Track active cloud clients per account
const cloudClients = new Map<string, CloudClient>();

/**
 * Resolve claw-ui account from config or environment
 */
function resolveClawUIAccount(cfg: OpenClawConfig, accountId?: string): ResolvedClawUIAccount {
  const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
  const channelConfig = cfg.channels?.["claw-ui"];
  
  // Check for account-based config first
  const accountConfig = channelConfig?.accounts?.[resolvedAccountId];
  
  // Fall back to top-level config or env vars
  const envTokenId = process.env.CLAW_UI_TOKEN_ID;
  const envTokenSecret = process.env.CLAW_UI_TOKEN;
  const envRelayUrl = process.env.CLAW_UI_RELAY_URL;
  const envMode = process.env.CLAW_UI_MODE as "local" | "cloud" | undefined;
  
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
  
  // Use top-level config
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
  
  // Env-only config
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
 * List configured account IDs
 */
function listClawUIAccountIds(cfg: OpenClawConfig): string[] {
  const accounts = cfg.channels?.["claw-ui"]?.accounts;
  if (accounts && typeof accounts === "object") {
    return Object.keys(accounts);
  }
  
  // Check if top-level or env config exists
  const hasTopLevel = cfg.channels?.["claw-ui"]?.tokenId || 
                      cfg.channels?.["claw-ui"]?.enabled;
  const hasEnv = process.env.CLAW_UI_TOKEN_ID && process.env.CLAW_UI_TOKEN;
  
  if (hasTopLevel || hasEnv) {
    return [DEFAULT_ACCOUNT_ID];
  }
  
  return [];
}

/**
 * The claw-ui channel plugin definition
 */
export const clawUIPlugin: ChannelPlugin<ResolvedClawUIAccount> = {
  id: "claw-ui",
  
  meta: {
    id: "claw-ui",
    label: "Claw UI",
    selectionLabel: "Claw UI (Web)",
    docsPath: "/channels/claw-ui",
    blurb: "Web chat interface for OpenClaw",
    aliases: ["clawui", "webui", "web"],
  },
  
  capabilities: {
    chatTypes: ["direct"],
    reactions: false,
    threads: false,
    media: true,
    nativeCommands: true,
  },
  
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", default: true },
      mode: { type: "string", enum: ["local", "cloud"], default: "cloud" },
      port: { type: "number", description: "Port for local mode WebSocket server" },
      relayUrl: { type: "string", description: "WebSocket URL for cloud relay" },
      tokenId: { type: "string", description: "Token ID for cloud authentication" },
      tokenSecret: { type: "string", description: "Token secret (or use CLAW_UI_TOKEN env)" },
      accounts: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            mode: { type: "string", enum: ["local", "cloud"] },
            relayUrl: { type: "string" },
            tokenId: { type: "string" },
            tokenSecret: { type: "string" },
          },
        },
      },
    },
  },
  
  config: {
    listAccountIds: (cfg) => listClawUIAccountIds(cfg),
    
    resolveAccount: (cfg, accountId) => resolveClawUIAccount(cfg, accountId),
    
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    
    isConfigured: (account) => {
      return account.config.mode === "local" || 
             Boolean(account.config.tokenId && account.config.tokenSecret);
    },
    
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.config.mode === "local" || 
                  Boolean(account.config.tokenId),
      tokenSource: account.tokenSource,
    }),
  },
  
  security: {
    resolveDmPolicy: ({ account }) => ({
      policy: "open" as const, // Web UI handles its own auth
      configPath: `channels.claw-ui`,
    }),
  },
  
  outbound: {
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
  },
  
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.config.tokenId) || account.config.mode === "local",
      tokenSource: account.tokenSource,
      running: runtime?.running ?? false,
      mode: account.config.mode ?? "cloud",
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
    }),
  },
  
  gateway: {
    startAccount: async (ctx) => {
      const { account, cfg, runtime, abortSignal, log } = ctx;
      const accountId = account.accountId;
      
      log?.info?.(`[${accountId}] starting claw-ui channel`);
      
      if (account.config.mode === "local") {
        // Local mode: start WebSocket server
        log?.info?.(`[${accountId}] local mode not yet implemented`);
        // TODO: Implement local WebSocket server
        return;
      }
      
      // Cloud mode: connect to relay
      const relayUrl = account.config.relayUrl;
      const tokenId = account.config.tokenId;
      const tokenSecret = account.config.tokenSecret;
      
      if (!relayUrl || !tokenId || !tokenSecret) {
        log?.error?.(`[${accountId}] missing relay credentials`);
        return;
      }
      
      log?.info?.(`[${accountId}] connecting to relay: ${relayUrl}`);
      
      const client = new CloudClient({
        relayUrl,
        tokenId,
        tokenSecret,
        accountId,
        runtime: getClawUIRuntime(),
        onMessage: async (senderId, message) => {
          // Route inbound messages to the agent
          // This will be handled by OpenClaw's inbound routing
          log?.debug?.(`[${accountId}] received message from ${senderId}`);
        },
      });
      
      cloudClients.set(accountId, client);
      
      try {
        await client.connect();
        log?.info?.(`[${accountId}] connected to relay`);
      } catch (err) {
        log?.error?.(`[${accountId}] failed to connect: ${err}`);
        cloudClients.delete(accountId);
        throw err;
      }
      
      // Handle abort signal for cleanup
      abortSignal?.addEventListener("abort", () => {
        log?.info?.(`[${accountId}] stopping claw-ui channel`);
        client.disconnect();
        cloudClients.delete(accountId);
      });
    },
  },
};
