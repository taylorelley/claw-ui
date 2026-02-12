/**
 * ClawUIChannel - OpenClaw Channel Plugin Implementation
 * Implements the ChannelPlugin interface for claw-ui web clients
 * Supports both local mode (WebSocket server) and cloud mode (relay client)
 */

const { ClawUIServer } = require('./server');
const { CloudClient } = require('./cloudClient');

class ClawUIChannel {
  constructor(config, runtime) {
    this.config = config;
    this.runtime = runtime;
    this.mode = config.mode || 'local'; // 'local' or 'cloud'
    this.server = null; // For local mode
    this.cloudClient = null; // For cloud mode
    this.sessions = new Map(); // oderId -> session info
    this.started = false;
  }

  /**
   * List account IDs (required by OpenClaw)
   * For claw-ui, we have a single "account" representing the web interface
   */
  listAccountIds() {
    return ['claw-ui-web'];
  }

  /**
   * Get account info
   */
  getAccountInfo(accountId) {
    if (accountId === 'claw-ui-web') {
      return {
        id: 'claw-ui-web',
        name: 'Claw UI Web Interface',
        type: 'web'
      };
    }
    return null;
  }

  /**
   * Start the channel (called by OpenClaw)
   */
  async start() {
    if (this.started) {
      console.log('[claw-ui] Channel already started');
      return;
    }

    console.log(`[claw-ui] Starting channel in ${this.mode} mode...`);
    
    if (this.mode === 'cloud') {
      // Cloud mode: connect to relay server
      this.cloudClient = new CloudClient(this.config, this);
      await this.cloudClient.start();
      console.log('[claw-ui] Channel started in cloud mode');
    } else {
      // Local mode: start WebSocket server
      this.server = new ClawUIServer(this.config, this);
      await this.server.start();
      console.log(`[claw-ui] Channel started in local mode on port ${this.config.port}`);
    }
    
    this.started = true;
  }

  /**
   * Stop the channel
   */
  async stop() {
    if (!this.started) return;
    
    console.log('[claw-ui] Stopping channel...');
    
    if (this.mode === 'cloud' && this.cloudClient) {
      await this.cloudClient.stop();
      this.cloudClient = null;
    } else if (this.server) {
      await this.server.stop();
      this.server = null;
    }
    
    this.started = false;
    console.log('[claw-ui] Channel stopped');
  }

  /**
   * Send a message to a client
   * Called by OpenClaw when the agent responds
   */
  async send(options) {
    const { to, message, accountId } = options;
    
    if (this.mode === 'cloud') {
      // Cloud mode: send via relay
      if (!this.cloudClient || !this.cloudClient.isReady()) {
        console.error('[claw-ui] Cloud client not ready');
        return { success: false, error: 'Cloud client not connected' };
      }

      const messageData = JSON.stringify({
        type: 'message',
        content: message,
        role: 'assistant',
        timestamp: Date.now()
      });

      const success = this.cloudClient.sendMessage(to, messageData);
      return { 
        success: success, 
        messageId: success ? `msg-${Date.now()}` : null,
        error: success ? null : 'Failed to send via relay'
      };
    } else {
      // Local mode: send directly to WebSocket client
      if (!this.server) {
        throw new Error('Channel not started');
      }

      // Find the client connection for this recipient
      const client = this.server.getClientBySessionId(to);
      if (!client) {
        console.warn(`[claw-ui] No client found for session ${to}`);
        return { success: false, error: 'Client not connected' };
      }

      // Send the message
      client.send(JSON.stringify({
        type: 'message',
        content: message,
        role: 'assistant',
        timestamp: Date.now()
      }));

      return { success: true, messageId: `msg-${Date.now()}` };
    }
  }

  /**
   * Handle incoming message from web client (local mode) or relay (cloud mode)
   * Routes to OpenClaw agent system
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {string} content - Message content
   * @param {object} client - WebSocket client (local mode) or CloudClient (cloud mode)
   */
  async handleIncomingMessage(sessionId, userId, content, client) {
    console.log(`[claw-ui] Incoming message from ${userId}: ${content.substring(0, 50)}...`);

    if (!this.runtime || !this.runtime.handleMessage) {
      console.error('[claw-ui] Runtime handleMessage not available');
      
      // Send error back to client if in local mode
      if (this.mode === 'local' && client && client.send) {
        client.send(JSON.stringify({
          type: 'error',
          message: 'Agent system not available'
        }));
      }
      return;
    }

    try {
      // Route message to OpenClaw
      await this.runtime.handleMessage({
        channel: 'claw-ui',
        accountId: 'claw-ui-web',
        from: userId,
        to: sessionId,
        content: content,
        timestamp: Date.now(),
        metadata: {
          sessionId: sessionId
        }
      });
    } catch (error) {
      console.error('[claw-ui] Error handling message:', error);
      
      // Send error back to client if in local mode
      if (this.mode === 'local' && client && client.send) {
        client.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    }
  }

  /**
   * Register a new session
   */
  registerSession(sessionId, userId, client) {
    this.sessions.set(sessionId, {
      sessionId,
      userId,
      client,
      connectedAt: Date.now()
    });
    console.log(`[claw-ui] Session registered: ${sessionId}`);
  }

  /**
   * Unregister a session
   */
  unregisterSession(sessionId) {
    this.sessions.delete(sessionId);
    console.log(`[claw-ui] Session unregistered: ${sessionId}`);
  }
}

module.exports = { ClawUIChannel };
