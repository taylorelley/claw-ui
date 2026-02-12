/**
 * CloudClient - Outbound WebSocket client for cloud relay server
 * Connects plugin to relay server, handles auth, reconnection, heartbeats
 */

const WebSocket = require('ws');
const { signAuth, signMessage, generateNonce, validateTimestamp } = require('./crypto');

class CloudClient {
  constructor(config, channel) {
    this.config = config;
    this.channel = channel;
    this.ws = null;
    this.authenticated = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.stopping = false;
    
    // Reconnection backoff config
    this.reconnectDelays = [1000, 2000, 4000, 8000, 16000, 32000, 60000]; // Max 60s
    
    // Get token secret from environment or config
    this.tokenSecret = process.env.CLAW_UI_TOKEN || this.config.tokenSecret;
    if (!this.tokenSecret) {
      throw new Error('Token secret not found in environment (CLAW_UI_TOKEN) or config');
    }
  }

  /**
   * Start the cloud client
   */
  async start() {
    console.log('[claw-ui] Starting cloud client...');
    this.stopping = false;
    this.connect();
  }

  /**
   * Stop the cloud client
   */
  async stop() {
    console.log('[claw-ui] Stopping cloud client...');
    this.stopping = true;
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.authenticated = false;
  }

  /**
   * Connect to relay server
   */
  connect() {
    if (this.stopping) return;
    
    const relayUrl = this.config.relayUrl;
    console.log(`[claw-ui] Connecting to relay server: ${relayUrl}`);
    
    try {
      this.ws = new WebSocket(relayUrl, {
        rejectUnauthorized: true // Validate SSL certificates
      });
      
      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data) => this.onMessage(data));
      this.ws.on('close', (code, reason) => this.onClose(code, reason));
      this.ws.on('error', (error) => this.onError(error));
    } catch (error) {
      console.error('[claw-ui] Failed to create WebSocket:', error.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection open
   */
  onOpen() {
    console.log('[claw-ui] Connected to relay server');
    this.reconnectAttempts = 0;
    
    // Send auth message
    this.authenticate();
  }

  /**
   * Authenticate with relay server
   */
  authenticate() {
    const timestamp = Date.now();
    const signature = signAuth(this.config.tokenId, this.tokenSecret, timestamp);
    
    const authMsg = {
      type: 'auth',
      tokenId: this.config.tokenId,
      timestamp: timestamp,
      signature: signature
    };
    
    console.log('[claw-ui] Sending auth message...');
    this.send(authMsg);
  }

  /**
   * Handle incoming message from relay
   */
  onMessage(data) {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      console.error('[claw-ui] Failed to parse message:', e.message);
      return;
    }

    switch (msg.type) {
      case 'auth_ok':
        console.log('[claw-ui] Authentication successful');
        this.authenticated = true;
        this.startHeartbeat();
        break;

      case 'auth_error':
        console.error('[claw-ui] Authentication failed:', msg.message);
        this.authenticated = false;
        // Don't reconnect on auth failure (likely bad credentials)
        this.stopping = true;
        if (this.ws) {
          this.ws.close();
        }
        break;

      case 'message':
        // Incoming message from user via relay
        this.handleIncomingMessage(msg);
        break;

      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break;

      case 'error':
        console.error('[claw-ui] Relay error:', msg.message);
        break;

      default:
        console.warn('[claw-ui] Unknown message type:', msg.type);
    }
  }

  /**
   * Handle incoming message from relay (user message)
   */
  async handleIncomingMessage(msg) {
    const { sessionId, content, userId } = msg;
    
    console.log(`[claw-ui] Incoming message from relay - session: ${sessionId}, user: ${userId}`);
    
    // Route to channel handler
    await this.channel.handleIncomingMessage(sessionId, userId, content, this);
  }

  /**
   * Handle connection close
   */
  onClose(code, reason) {
    console.log(`[claw-ui] Disconnected from relay server (code: ${code}, reason: ${reason})`);
    this.authenticated = false;
    
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Schedule reconnection if not stopping
    if (!this.stopping) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  onError(error) {
    console.error('[claw-ui] WebSocket error:', error.message);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.stopping || this.reconnectTimer) return;
    
    const delayIndex = Math.min(this.reconnectAttempts, this.reconnectDelays.length - 1);
    const delay = this.reconnectDelays[delayIndex];
    
    console.log(`[claw-ui] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat timer
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // Send heartbeat every 30 seconds
    this.heartbeatTimer = setInterval(() => {
      if (this.authenticated && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat' });
      }
    }, 30000);
  }

  /**
   * Send message to relay
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[claw-ui] Cannot send - WebSocket not connected');
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[claw-ui] Failed to send message:', error.message);
      return false;
    }
  }

  /**
   * Send agent response to relay (called by channel)
   * @param {string} sessionId - Session ID
   * @param {string} content - Message content
   * @returns {boolean} Success
   */
  sendMessage(sessionId, content) {
    if (!this.authenticated) {
      console.error('[claw-ui] Cannot send message - not authenticated');
      return false;
    }
    
    const nonce = generateNonce();
    const timestamp = Date.now();
    const signature = signMessage(this.tokenSecret, sessionId, content, nonce, timestamp);
    
    const msg = {
      type: 'message',
      sessionId: sessionId,
      content: content,
      nonce: nonce,
      timestamp: timestamp,
      signature: signature
    };
    
    return this.send(msg);
  }

  /**
   * Check if client is connected and authenticated
   */
  isReady() {
    return this.authenticated && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = { CloudClient };
