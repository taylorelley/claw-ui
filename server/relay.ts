import crypto from 'crypto';
import { WebSocket } from 'ws';
import {
  AgentConnection,
  ClientConnection,
  RelayOutgoingMessage,
  AgentIncomingMessage,
  ClientIncomingMessage,
} from './types.js';
import {
  verifyAgentToken,
  verifyClientJWT,
  verifyMessageSignature,
  updateAgentConnectionStatus,
  updateLastSeen,
} from './auth.js';
import { checkRateLimit } from './rateLimit.js';

const MESSAGE_SIZE_LIMIT = 64 * 1024; // 64KB
const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Track nonces to prevent replay attacks
const usedNonces = new Set<string>();
const MAX_NONCE_CACHE_SIZE = 10000;

// Cleanup old nonces periodically
setInterval(() => {
  if (usedNonces.size > MAX_NONCE_CACHE_SIZE) {
    usedNonces.clear();
  }
}, 10 * 60 * 1000);

export class RelayServer {
  // Map: user_id -> Map<token_id, AgentConnection>
  private agentConnections = new Map<string, Map<string, AgentConnection>>();

  // Map: user_id -> Map<session_id, ClientConnection>
  private clientConnections = new Map<string, Map<string, ClientConnection>>();

  // Connection timeouts
  private connectionTimeouts = new Map<WebSocket, NodeJS.Timeout>();

  constructor() {
    console.log('🚀 RelayServer initialized');
  }

  /**
   * Handle new agent connection
   */
  async handleAgentConnection(ws: WebSocket): Promise<void> {
    console.log('🔵 New agent connection attempt');

    let authenticated = false;
    let agentConn: AgentConnection | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as AgentIncomingMessage;

        if (!authenticated) {
          if (message.type === 'auth') {
            const result = await this.authenticateAgent(ws, message);
            if (result) {
              authenticated = true;
              agentConn = result;
              this.resetConnectionTimeout(ws);
            }
          } else {
            this.sendError(ws, 'Authentication required');
            ws.close();
          }
          return;
        }

        // Authenticated messages
        if (!agentConn) return;

        switch (message.type) {
          case 'heartbeat':
            this.handleAgentHeartbeat(agentConn);
            this.resetConnectionTimeout(ws);
            break;

          case 'message':
            await this.handleAgentMessage(agentConn, message);
            this.resetConnectionTimeout(ws);
            break;

          default:
            this.sendError(ws, 'Unknown message type');
        }
      } catch (error) {
        console.error('Error handling agent message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      if (agentConn) {
        this.disconnectAgent(agentConn);
      }
      this.clearConnectionTimeout(ws);
    });

    ws.on('error', (error) => {
      console.error('Agent WebSocket error:', error);
    });

    // Set initial timeout
    this.setConnectionTimeout(ws);
  }

  /**
   * Handle new client connection
   */
  async handleClientConnection(ws: WebSocket): Promise<void> {
    console.log('🟢 New client connection attempt');

    let authenticated = false;
    let clientConn: ClientConnection | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientIncomingMessage;

        if (!authenticated) {
          if (message.type === 'auth') {
            const result = await this.authenticateClient(ws, message);
            if (result) {
              authenticated = true;
              clientConn = result;
              this.resetConnectionTimeout(ws);
            }
          } else {
            this.sendError(ws, 'Authentication required');
            ws.close();
          }
          return;
        }

        // Authenticated messages
        if (!clientConn) return;

        switch (message.type) {
          case 'ping':
            this.handleClientPing(clientConn);
            this.resetConnectionTimeout(ws);
            break;

          case 'message':
            await this.handleClientMessage(clientConn, message);
            this.resetConnectionTimeout(ws);
            break;

          default:
            this.sendError(ws, 'Unknown message type');
        }
      } catch (error) {
        console.error('Error handling client message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      if (clientConn) {
        this.disconnectClient(clientConn);
      }
      this.clearConnectionTimeout(ws);
    });

    ws.on('error', (error) => {
      console.error('Client WebSocket error:', error);
    });

    // Set initial timeout
    this.setConnectionTimeout(ws);
  }

  /**
   * Authenticate agent connection
   */
  private async authenticateAgent(
    ws: WebSocket,
    message: { tokenId: string; signature: string; timestamp: number }
  ): Promise<AgentConnection | null> {
    const payload = `${message.tokenId}:${message.timestamp}`;
    const result = await verifyAgentToken(message.tokenId, message.signature, payload);

    if (!result.valid || !result.token) {
      this.sendMessage(ws, {
        type: 'auth_error',
        message: result.error || 'Authentication failed',
      });
      ws.close();
      return null;
    }

    const agentConn: AgentConnection = {
      ws,
      userId: result.token.user_id,
      tokenId: result.token.id,
      tokenSecret: result.token.token_secret,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    // Store connection
    if (!this.agentConnections.has(agentConn.userId)) {
      this.agentConnections.set(agentConn.userId, new Map());
    }
    this.agentConnections.get(agentConn.userId)!.set(agentConn.tokenId, agentConn);

    // Update database
    await updateAgentConnectionStatus(agentConn.userId, agentConn.tokenId, true);

    // Notify connected clients
    this.notifyClientsOfAgentStatus(agentConn.userId, agentConn.tokenId, true);

    this.sendMessage(ws, { type: 'auth_ok', agentId: agentConn.tokenId });
    console.log(`✅ Agent authenticated: ${agentConn.tokenId} (user: ${agentConn.userId})`);

    return agentConn;
  }

  /**
   * Authenticate client connection
   */
  private async authenticateClient(
    ws: WebSocket,
    message: { jwt: string; agentId: string }
  ): Promise<ClientConnection | null> {
    const result = verifyClientJWT(message.jwt);

    if (!result.valid || !result.userId) {
      this.sendMessage(ws, {
        type: 'auth_error',
        message: result.error || 'Authentication failed',
      });
      ws.close();
      return null;
    }

    const sessionId = this.generateSessionId();
    const clientConn: ClientConnection = {
      ws,
      userId: result.userId,
      sessionId,
      agentId: message.agentId,
      connectedAt: new Date(),
      lastPing: new Date(),
    };

    // Store connection
    if (!this.clientConnections.has(clientConn.userId)) {
      this.clientConnections.set(clientConn.userId, new Map());
    }
    this.clientConnections.get(clientConn.userId)!.set(sessionId, clientConn);

    // Check if agent is online
    const agentOnline = this.isAgentOnline(clientConn.userId, clientConn.agentId);

    this.sendMessage(ws, { type: 'auth_ok', sessionId, agentId: clientConn.agentId });
    this.sendMessage(ws, { type: 'agent_status', online: agentOnline });

    console.log(
      `✅ Client authenticated: session=${sessionId}, user=${clientConn.userId}, agent=${clientConn.agentId}`
    );

    return clientConn;
  }

  /**
   * Handle agent heartbeat
   */
  private handleAgentHeartbeat(conn: AgentConnection): void {
    conn.lastHeartbeat = new Date();
    updateLastSeen(conn.userId, conn.tokenId);
  }

  /**
   * Handle agent message
   */
  private async handleAgentMessage(
    conn: AgentConnection,
    message: {
      sessionId: string;
      content: string;
      nonce: string;
      signature: string;
      timestamp: number;
    }
  ): Promise<void> {
    // Check message size
    if (message.content.length > MESSAGE_SIZE_LIMIT) {
      this.sendError(conn.ws, 'Message too large');
      return;
    }

    // Check rate limit
    if (!checkRateLimit(conn.userId)) {
      this.sendError(conn.ws, 'Rate limit exceeded');
      return;
    }

    // Check nonce for replay protection
    if (usedNonces.has(message.nonce)) {
      this.sendError(conn.ws, 'Duplicate nonce (replay attack?)');
      return;
    }

    // Verify signature
    const sigResult = verifyMessageSignature(
      conn.tokenSecret,
      message.content,
      message.nonce,
      message.timestamp,
      message.signature
    );

    if (!sigResult.valid) {
      this.sendError(conn.ws, sigResult.error || 'Invalid signature');
      return;
    }

    // Mark nonce as used
    usedNonces.add(message.nonce);

    // Route to client
    this.routeToClient(conn.userId, message.sessionId, {
      type: 'message',
      content: message.content,
      role: 'assistant',
    });
  }

  /**
   * Handle client ping
   */
  private handleClientPing(conn: ClientConnection): void {
    conn.lastPing = new Date();
    this.sendMessage(conn.ws, { type: 'pong' });
  }

  /**
   * Handle client message
   */
  private async handleClientMessage(
    conn: ClientConnection,
    message: { content: string }
  ): Promise<void> {
    // Check message size
    if (message.content.length > MESSAGE_SIZE_LIMIT) {
      this.sendError(conn.ws, 'Message too large');
      return;
    }

    // Check rate limit
    if (!checkRateLimit(conn.userId)) {
      this.sendError(conn.ws, 'Rate limit exceeded');
      return;
    }

    // Route to agent
    this.routeToAgent(conn.userId, conn.agentId, conn.sessionId, {
      type: 'message',
      content: message.content,
      role: 'user',
    });
  }

  /**
   * Route message to agent
   */
  private routeToAgent(
    userId: string,
    agentId: string,
    sessionId: string,
    message: RelayOutgoingMessage
  ): void {
    const userAgents = this.agentConnections.get(userId);
    if (!userAgents) {
      console.warn(`No agents connected for user ${userId}`);
      return;
    }

    const agent = userAgents.get(agentId);
    if (!agent) {
      console.warn(`Agent ${agentId} not connected for user ${userId}`);
      return;
    }

    // Add sessionId to message for agent routing
    const agentMessage = { ...message, sessionId };
    this.sendMessage(agent.ws, agentMessage);
  }

  /**
   * Route message to client
   */
  private routeToClient(
    userId: string,
    sessionId: string,
    message: RelayOutgoingMessage
  ): void {
    const userClients = this.clientConnections.get(userId);
    if (!userClients) {
      console.warn(`No clients connected for user ${userId}`);
      return;
    }

    const client = userClients.get(sessionId);
    if (!client) {
      console.warn(`Client session ${sessionId} not found for user ${userId}`);
      return;
    }

    this.sendMessage(client.ws, message);
  }

  /**
   * Disconnect agent
   */
  private disconnectAgent(conn: AgentConnection): void {
    const userAgents = this.agentConnections.get(conn.userId);
    if (userAgents) {
      userAgents.delete(conn.tokenId);
      if (userAgents.size === 0) {
        this.agentConnections.delete(conn.userId);
      }
    }

    updateAgentConnectionStatus(conn.userId, conn.tokenId, false);
    this.notifyClientsOfAgentStatus(conn.userId, conn.tokenId, false);

    console.log(`🔴 Agent disconnected: ${conn.tokenId} (user: ${conn.userId})`);
  }

  /**
   * Disconnect client
   */
  private disconnectClient(conn: ClientConnection): void {
    const userClients = this.clientConnections.get(conn.userId);
    if (userClients) {
      userClients.delete(conn.sessionId);
      if (userClients.size === 0) {
        this.clientConnections.delete(conn.userId);
      }
    }

    console.log(`🔴 Client disconnected: session=${conn.sessionId}, user=${conn.userId}`);
  }

  /**
   * Check if agent is online
   */
  private isAgentOnline(userId: string, agentId: string): boolean {
    const userAgents = this.agentConnections.get(userId);
    return userAgents ? userAgents.has(agentId) : false;
  }

  /**
   * Notify clients of agent status change
   */
  private notifyClientsOfAgentStatus(
    userId: string,
    agentId: string,
    online: boolean
  ): void {
    const userClients = this.clientConnections.get(userId);
    if (!userClients) return;

    for (const [, client] of userClients) {
      if (client.agentId === agentId) {
        this.sendMessage(client.ws, { type: 'agent_status', online });
      }
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, message: string): void {
    this.sendMessage(ws, { type: 'error', message });
  }

  /**
   * Generate random session ID
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Set connection timeout
   */
  private setConnectionTimeout(ws: WebSocket): void {
    const timeout = setTimeout(() => {
      console.log('⏱️  Connection timeout - closing');
      ws.close();
    }, CONNECTION_TIMEOUT_MS);

    this.connectionTimeouts.set(ws, timeout);
  }

  /**
   * Reset connection timeout
   */
  private resetConnectionTimeout(ws: WebSocket): void {
    this.clearConnectionTimeout(ws);
    this.setConnectionTimeout(ws);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(ws: WebSocket): void {
    const timeout = this.connectionTimeouts.get(ws);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(ws);
    }
  }

  /**
   * Get server statistics
   */
  getStats(): {
    agents: number;
    clients: number;
    userCount: number;
  } {
    let totalAgents = 0;
    let totalClients = 0;

    for (const userAgents of this.agentConnections.values()) {
      totalAgents += userAgents.size;
    }

    for (const userClients of this.clientConnections.values()) {
      totalClients += userClients.size;
    }

    return {
      agents: totalAgents,
      clients: totalClients,
      userCount: this.agentConnections.size,
    };
  }
}
