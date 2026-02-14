import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import { RelayServer } from './relay.js';
import { initSupabase } from './auth.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

// Initialize Supabase (graceful fallback if not configured)
initSupabase();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket servers
const agentWss = new WebSocketServer({ noServer: true });
const clientWss = new WebSocketServer({ noServer: true });

// Create relay server
const relay = new RelayServer();

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = relay.getStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    stats,
    timestamp: new Date().toISOString(),
  });
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

  if (pathname === '/relay/agent') {
    agentWss.handleUpgrade(request, socket, head, (ws) => {
      agentWss.emit('connection', ws, request);
    });
  } else if (pathname === '/relay/client') {
    clientWss.handleUpgrade(request, socket, head, (ws) => {
      clientWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Handle agent connections
agentWss.on('connection', (ws) => {
  relay.handleAgentConnection(ws);
});

// Handle client connections
clientWss.on('connection', (ws) => {
  relay.handleClientConnection(ws);
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🚀 Claw UI Relay Server             ║
║                                       ║
║  Port: ${PORT.toString().padEnd(30)}║
║  Agent endpoint:  /relay/agent        ║
║  Client endpoint: /relay/client       ║
║  Health check:    /health             ║
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
