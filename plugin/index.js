/**
 * claw-ui OpenClaw Channel Plugin
 * Compliant with official OpenClaw plugin architecture
 */

const { CloudClient } = require('./src/cloudClient.js');

// Runtime storage
let runtime = null;
const cloudClients = new Map();
const DEFAULT_ACCOUNT_ID = 'default';

function setClawUIRuntime(r) {
  runtime = r;
}

function getClawUIRuntime() {
  if (!runtime) throw new Error('claw-ui runtime not initialized');
  return runtime;
}

// Config helpers
function resolveClawUIAccount(cfg, accountId) {
  const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
  const channelConfig = cfg?.channels?.['claw-ui'];
  const accountConfig = channelConfig?.accounts?.[resolvedAccountId];
  
  const envTokenId = process.env.CLAW_UI_TOKEN_ID;
  const envTokenSecret = process.env.CLAW_UI_TOKEN;
  const envRelayUrl = process.env.CLAW_UI_RELAY_URL;
  const envMode = process.env.CLAW_UI_MODE;

  if (accountConfig) {
    return {
      accountId: resolvedAccountId,
      name: accountConfig.name,
      enabled: accountConfig.enabled !== false,
      config: accountConfig,
      tokenSource: accountConfig.tokenId ? 'config' : 'none',
    };
  }
  
  if (channelConfig) {
    return {
      accountId: resolvedAccountId,
      enabled: channelConfig.enabled !== false,
      config: {
        ...channelConfig,
        relayUrl: channelConfig.relayUrl ?? envRelayUrl,
        tokenId: channelConfig.tokenId ?? envTokenId,
        tokenSecret: channelConfig.tokenSecret ?? envTokenSecret,
        mode: channelConfig.mode ?? envMode ?? 'cloud',
      },
      tokenSource: channelConfig.tokenId ? 'config' : envTokenId ? 'env' : 'none',
    };
  }
  
  if (envTokenId && envTokenSecret) {
    return {
      accountId: resolvedAccountId,
      enabled: true,
      config: {
        enabled: true,
        mode: envMode ?? 'cloud',
        relayUrl: envRelayUrl ?? 'wss://claw-ui.app.taylorelley.com/relay/agent',
        tokenId: envTokenId,
        tokenSecret: envTokenSecret,
      },
      tokenSource: 'env',
    };
  }
  
  return { accountId: resolvedAccountId, enabled: false, config: {}, tokenSource: 'none' };
}

function listClawUIAccountIds(cfg) {
  const accounts = cfg?.channels?.['claw-ui']?.accounts;
  if (accounts && typeof accounts === 'object') return Object.keys(accounts);
  
  const hasConfig = cfg?.channels?.['claw-ui']?.tokenId || cfg?.channels?.['claw-ui']?.enabled;
  const hasEnv = process.env.CLAW_UI_TOKEN_ID && process.env.CLAW_UI_TOKEN;
  
  return (hasConfig || hasEnv) ? [DEFAULT_ACCOUNT_ID] : [];
}

// Channel plugin definition
const clawUIPlugin = {
  id: 'claw-ui',
  
  meta: {
    id: 'claw-ui',
    label: 'Claw UI',
    selectionLabel: 'Claw UI (Web)',
    docsPath: '/channels/claw-ui',
    blurb: 'Web chat interface for OpenClaw',
    aliases: ['clawui', 'webui', 'web'],
  },
  
  capabilities: {
    chatTypes: ['direct'],
    reactions: false,
    threads: false,
    media: true,
    nativeCommands: true,
  },
  
  config: {
    listAccountIds: (cfg) => listClawUIAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveClawUIAccount(cfg, accountId),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    isConfigured: (account) => account.config.mode === 'local' || Boolean(account.config.tokenId && account.config.tokenSecret),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.config.mode === 'local' || Boolean(account.config.tokenId),
      tokenSource: account.tokenSource,
    }),
  },
  
  security: {
    resolveDmPolicy: () => ({ policy: 'open', configPath: 'channels.claw-ui' }),
  },
  
  outbound: {
    deliveryMode: 'direct',
    textChunkLimit: 4000,
    
    sendText: async ({ to, text, accountId }) => {
      const client = cloudClients.get(accountId ?? DEFAULT_ACCOUNT_ID);
      if (!client) return { ok: false, error: 'Channel not connected' };
      try {
        await client.sendToClient(to, { type: 'message', content: text });
        return { ok: true, channel: 'claw-ui' };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },
    
    sendMedia: async ({ to, text, mediaUrl, accountId }) => {
      const client = cloudClients.get(accountId ?? DEFAULT_ACCOUNT_ID);
      if (!client) return { ok: false, error: 'Channel not connected' };
      try {
        await client.sendToClient(to, { type: 'message', content: text, media: mediaUrl });
        return { ok: true, channel: 'claw-ui' };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },
  },
  
  status: {
    defaultRuntime: { accountId: DEFAULT_ACCOUNT_ID, running: false, lastStartAt: null, lastStopAt: null, lastError: null },
    buildAccountSnapshot: ({ account, runtime: rt }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.config.tokenId) || account.config.mode === 'local',
      tokenSource: account.tokenSource,
      running: rt?.running ?? false,
      mode: account.config.mode ?? 'cloud',
    }),
  },
  
  gateway: {
    startAccount: async (ctx) => {
      const { account, abortSignal, log } = ctx;
      const accountId = account.accountId;
      
      log?.info?.(`[${accountId}] starting claw-ui channel`);
      
      if (account.config.mode === 'local') {
        log?.info?.(`[${accountId}] local mode not implemented`);
        return;
      }
      
      const { relayUrl, tokenId, tokenSecret } = account.config;
      if (!relayUrl || !tokenId || !tokenSecret) {
        log?.error?.(`[${accountId}] missing relay credentials`);
        return;
      }
      
      log?.info?.(`[${accountId}] connecting to relay: ${relayUrl}`);
      
      const client = new CloudClient({
        relayUrl, tokenId, tokenSecret, accountId,
        runtime: getClawUIRuntime(),
        onMessage: async (senderId, message) => {
          log?.debug?.(`[${accountId}] received message from ${senderId}`);
        },
      });
      
      cloudClients.set(accountId, client);
      
      try {
        await client.connect();
        log?.info?.(`[${accountId}] connected to relay`);
      } catch (err) {
        log?.error?.(`[${accountId}] connection failed: ${err}`);
        cloudClients.delete(accountId);
        throw err;
      }
      
      abortSignal?.addEventListener('abort', () => {
        log?.info?.(`[${accountId}] stopping (abort signal)`);
        client.disconnect();
        cloudClients.delete(accountId);
      });
    },
    
    stopAccount: async (ctx) => {
      const { account, log } = ctx;
      log?.info?.(`[${account.accountId}] stopping`);
      const client = cloudClients.get(account.accountId);
      if (client) {
        client.disconnect();
        cloudClients.delete(account.accountId);
      }
    },
  },
  
  configSchema: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
      mode: { type: 'string', enum: ['local', 'cloud'] },
      relayUrl: { type: 'string' },
      tokenId: { type: 'string' },
      tokenSecret: { type: 'string' },
      accounts: { type: 'object' },
    },
  },
};

// Plugin export
const plugin = {
  id: 'claw-ui',
  name: 'Claw UI',
  description: 'Web chat interface channel for OpenClaw',
  configSchema: { type: 'object', additionalProperties: false, properties: {} },
  
  register(api) {
    setClawUIRuntime(api.runtime);
    api.registerChannel({ plugin: clawUIPlugin });
  },
};

module.exports = plugin;
