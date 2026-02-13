/**
 * CloudClient - WebSocket client for claw-ui relay server
 * 
 * Handles:
 * - Connection to relay server
 * - HMAC-SHA256 authentication
 * - Message routing between agent and web clients
 * - Automatic reconnection with exponential backoff
 */

import WebSocket from "ws";
import crypto from "crypto";
import type { PluginRuntime } from "openclaw/plugin-sdk";

// ============================================================================
// Types
// ============================================================================

interface CloudClientConfig {
  relayUrl: string;
  tokenId: string;
  tokenSecret: string;
  accountId: string;
  runtime: PluginRuntime;
  onMessage?: (senderId: string, message: unknown) => Promise<void>;
}

interface RelayMessage {
  type: string;
  [key: string]: unknown;
}

// ============================================================================
// CloudClient
// ============================================================================

export class CloudClient {
  private config: CloudClientConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private connected = false;
  private authenticated = false;
  private shouldReconnect = true;

  constructor(config: CloudClientConfig) {
    this.config = config;
  }

  /**
   * Connect to the relay server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { relayUrl } = this.config;
      
      console.log(`[claw-ui] Connecting to relay: ${relayUrl}`);
      
      try {
        this.ws = new WebSocket(relayUrl, {
          rejectUnauthorized: true,
        });

        const authTimeout = setTimeout(() => {
          if (!this.authenticated) {
            reject(new Error("Authentication timeout"));
            this.ws?.close();
          }
        }, 15000);

        this.ws.on("open", () => {
          console.log("[claw-ui] Connected to relay, authenticating...");
          this.connected = true;
          this.reconnectAttempts = 0;
          this.authenticate();
        });

        this.ws.on("message", (data) => {
          const result = this.handleMessage(data);
          if (result === "auth_success") {
            clearTimeout(authTimeout);
            resolve();
          } else if (result === "auth_error") {
            clearTimeout(authTimeout);
            reject(new Error("Authentication failed"));
          }
        });

        this.ws.on("error", (err) => {
          console.error(`[claw-ui] WebSocket error: ${err.message}`);
          if (!this.connected) {
            clearTimeout(authTimeout);
            reject(err);
          }
        });

        this.ws.on("close", (code, reason) => {
          console.log(`[claw-ui] Disconnected (code: ${code}, reason: ${reason.toString()})`);
          this.connected = false;
          this.authenticated = false;
          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        });
        
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from relay (no reconnect)
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
  }

  /**
   * Check if connected and authenticated
   */
  isConnected(): boolean {
    return this.connected && this.authenticated;
  }

  /**
   * Authenticate with relay using HMAC-SHA256
   */
  private authenticate(): void {
    const { tokenId, tokenSecret } = this.config;
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    
    // HMAC signature: sign "tokenId:timestamp:nonce" with secret
    const message = `${tokenId}:${timestamp}:${nonce}`;
    const signature = crypto
      .createHmac("sha256", tokenSecret)
      .update(message)
      .digest("hex");

    this.send({
      type: "auth",
      tokenId,
      timestamp,
      nonce,
      signature,
    });
  }

  /**
   * Handle incoming message from relay
   * Returns message type for connection promise resolution
   */
  private handleMessage(data: WebSocket.Data): string | void {
    try {
      const message = JSON.parse(data.toString()) as RelayMessage;
      
      switch (message.type) {
        case "auth_success":
          console.log("[claw-ui] Authenticated with relay");
          this.authenticated = true;
          return "auth_success";
          
        case "auth_error":
          console.error(`[claw-ui] Authentication failed: ${message.error}`);
          this.disconnect();
          return "auth_error";
          
        case "message":
          this.handleInboundMessage(message);
          break;
          
        case "ping":
          this.send({ type: "pong" });
          break;
          
        case "error":
          console.error(`[claw-ui] Relay error: ${message.error}`);
          break;
          
        default:
          console.log(`[claw-ui] Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error(`[claw-ui] Failed to parse message: ${err}`);
    }
  }

  /**
   * Handle inbound message from web client
   */
  private async handleInboundMessage(message: RelayMessage): Promise<void> {
    const senderId = message.senderId as string;
    const content = message.content;
    
    console.log(`[claw-ui] Inbound message from ${senderId}`);
    
    if (this.config.onMessage) {
      try {
        await this.config.onMessage(senderId, content);
      } catch (err) {
        console.error(`[claw-ui] Error handling inbound message: ${err}`);
      }
    }
  }

  /**
   * Send message to a specific web client
   */
  async sendToClient(clientId: string, payload: unknown): Promise<void> {
    if (!this.authenticated) {
      throw new Error("Not authenticated with relay");
    }
    
    this.send({
      type: "message",
      targetId: clientId,
      content: payload,
    });
  }

  /**
   * Send raw message to relay
   */
  private send(message: RelayMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[claw-ui] Cannot send - WebSocket not open");
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[claw-ui] Max reconnect attempts reached, giving up");
      return;
    }
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );
    
    this.reconnectAttempts++;
    console.log(`[claw-ui] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch((err) => {
          console.error(`[claw-ui] Reconnect failed: ${err.message}`);
        });
      }
    }, delay);
  }
}
