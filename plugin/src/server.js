/**
 * ClawUIServer - Express + WebSocket server for claw-ui
 * Serves static files and handles WebSocket connections
 */

const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ClawUIServer {
  constructor(config, channel) {
    this.config = config;
    this.channel = channel;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.clients = new Map(); // ws -> client info
    this.sessionClients = new Map(); // sessionId -> ws
  }

  async start() {
    const port = this.config.port || 18800;
    const staticDir = this.config.staticDir;
    const authToken = this.config.auth?.token;
    const authMode = this.config.auth?.mode || 'token';

    // Serve static files if configured
    if (staticDir) {
      console.log(`[claw-ui] Serving static files from: ${staticDir}`);
      this.app.use(express.static(staticDir));
      
      // SPA fallback - serve index.html for all non-file routes
      this.app.get('*', (req, res) => {
        // Don't serve index.html for /ws
        if (req.path === '/ws') {
          res.status(404).send('WebSocket endpoint');
          return;
        }
        res.sendFile(path.join(staticDir, 'index.html'));
      });
    }

    // Create HTTP server
    this.server = http.createServer(this.app);

    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server: this.server, 
      path: '/ws' 
    });

    this.wss.on('connection', (ws, req) => {
      console.log('[claw-ui] New WebSocket connection');
      
      const clientId = uuidv4();
      const clientInfo = {
        id: clientId,
        ws: ws,
        authenticated: authMode === 'none',
        sessionId: null,
        userId: null
      };
      
      this.clients.set(ws, clientInfo);

      // If no auth required, auto-authenticate
      if (authMode === 'none') {
        clientInfo.authenticated = true;
        clientInfo.sessionId = `session-${clientId}`;
        clientInfo.userId = `user-${clientId}`;
        this.sessionClients.set(clientInfo.sessionId, ws);
        this.channel.registerSession(clientInfo.sessionId, clientInfo.userId, ws);
        
        ws.send(JSON.stringify({ type: 'auth_ok', sessionId: clientInfo.sessionId }));
      }

      ws.on('message', (data) => {
        this.handleMessage(ws, clientInfo, data.toString());
      });

      ws.on('close', () => {
        console.log(`[claw-ui] Client disconnected: ${clientId}`);
        if (clientInfo.sessionId) {
          this.sessionClients.delete(clientInfo.sessionId);
          this.channel.unregisterSession(clientInfo.sessionId);
        }
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error(`[claw-ui] WebSocket error: ${error.message}`);
      });
    });

    // Start listening
    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
        console.log(`[claw-ui] Server listening on port ${port}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  handleMessage(ws, clientInfo, rawMessage) {
    let msg;
    try {
      msg = JSON.parse(rawMessage);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    const authToken = this.config.auth?.token;

    switch (msg.type) {
      case 'auth': {
        // Authenticate with token using constant-time comparison
        const tokenValid = typeof msg.token === 'string' &&
          typeof authToken === 'string' &&
          msg.token.length === authToken.length &&
          crypto.timingSafeEqual(Buffer.from(msg.token), Buffer.from(authToken));

        if (tokenValid) {
          clientInfo.authenticated = true;
          // Always generate server-side IDs to prevent session hijacking
          clientInfo.sessionId = `session-${uuidv4()}`;
          clientInfo.userId = `user-${uuidv4()}`;

          this.sessionClients.set(clientInfo.sessionId, ws);
          this.channel.registerSession(clientInfo.sessionId, clientInfo.userId, ws);

          ws.send(JSON.stringify({ type: 'auth_ok', sessionId: clientInfo.sessionId }));
          console.log(`[claw-ui] Client authenticated: ${clientInfo.sessionId}`);
        } else {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
          console.log('[claw-ui] Authentication failed');
        }
        break;
      }

      case 'message':
        if (!clientInfo.authenticated) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }
        
        // Route message to OpenClaw
        this.channel.handleIncomingMessage(
          clientInfo.sessionId,
          clientInfo.userId,
          msg.content,
          ws
        );
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
    }
  }

  getClientBySessionId(sessionId) {
    return this.sessionClients.get(sessionId);
  }

  async stop() {
    return new Promise((resolve) => {
      // Close all WebSocket connections
      for (const [ws, _] of this.clients) {
        ws.close();
      }
      this.clients.clear();
      this.sessionClients.clear();

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          console.log('[claw-ui] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = { ClawUIServer };
