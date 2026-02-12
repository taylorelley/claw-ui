import { WebSocket } from 'ws';

// Connection info
export interface AgentConnection {
  ws: WebSocket;
  userId: string;
  tokenId: string;
  tokenSecret: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

export interface ClientConnection {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  agentId: string;
  connectedAt: Date;
  lastPing: Date;
}

// Message types from agent
export interface AgentAuthMessage {
  type: 'auth';
  tokenId: string;
  signature: string;
}

export interface AgentMessage {
  type: 'message';
  sessionId: string;
  content: string;
  nonce: string;
  signature: string;
  timestamp: number;
}

export interface AgentHeartbeat {
  type: 'heartbeat';
}

export type AgentIncomingMessage = AgentAuthMessage | AgentMessage | AgentHeartbeat;

// Message types from client
export interface ClientAuthMessage {
  type: 'auth';
  jwt: string;
  agentId: string;
}

export interface ClientMessage {
  type: 'message';
  content: string;
}

export interface ClientPing {
  type: 'ping';
}

export type ClientIncomingMessage = ClientAuthMessage | ClientMessage | ClientPing;

// Message types from relay
export interface AuthOkMessage {
  type: 'auth_ok';
  agentId?: string;
  sessionId?: string;
}

export interface AuthErrorMessage {
  type: 'auth_error';
  message: string;
}

export interface RelayMessage {
  type: 'message';
  content: string;
  role: 'user' | 'assistant';
}

export interface AgentStatusMessage {
  type: 'agent_status';
  online: boolean;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface PongMessage {
  type: 'pong';
}

export type RelayOutgoingMessage = 
  | AuthOkMessage 
  | AuthErrorMessage 
  | RelayMessage 
  | AgentStatusMessage 
  | ErrorMessage 
  | PongMessage;

// Database types
export interface AgentToken {
  id: string;
  user_id: string;
  name: string;
  token_secret: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Rate limiting
export interface RateLimitEntry {
  count: number;
  resetAt: Date;
}
