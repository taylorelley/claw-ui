/**
 * CloudClient - Handles WebSocket connection to the claw-ui relay server
 * Used in cloud mode to connect agent to the hosted relay
 */

import WebSocket from "ws";
import crypto from "crypto";
import type { OpenClawRuntime } from "openclaw/plugin-sdk";

interface CloudClientConfig {
  relayUrl: string;
  tokenId: string;
  tokenSecret: string;
  accountId: string;
  runtime: OpenClawRuntime;
  onMessage?: (senderId: string, message: unknown) => Promise<void>;
}

interface RelayMessage {
  type: string;
  [key: string]: unknown;
}

export class CloudClient {
  private config: CloudClientConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private connected = false;
  private authenticated = false;

  constructor(config: CloudClientConfig) {
    this.config = config;
  }

  /**
   * Connect to the relay server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { relayUrl, tokenId, tokenSecret } = this.config;
      
      console.log(`[claw-ui] Connecting to relay: ${relayUrl}`);
      
      try {
        this.ws = new WebSocket(relayUrl, {
          rejectUnauthorized: true,
        });

        this.ws.on("open", () => {
          console.log("[claw-ui] Connected to relay, authenticating...");
          this.connected = true;
          this.reconnectAttempts = 0;
          this.authenticate();
        });

        this.ws.on("message", (data) => {
          this.handleMessage(data);
          if (this.authenticated) {
            resolve();
          }
        });

        this.ws.on("error", (err) => {
          console.error(`[claw-ui] WebSocket error: ${err.message}`);
          if (!this.connected) {
            reject(err);
          }
        });

        this.ws.on("close", (code, reason) => {
          console.log(`[claw-ui] Disconnected (code: ${code}, reason: ${reason})`);
          this.connected = false;
          this.authenticated = false;
          this.scheduleReconnect();
        });

        // Timeout for initial connection
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error("Connection timeout"));
          }
        }, 10000);
        
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from relay
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
  }

  /**
   * Authenticate with the relay using HMAC
   */
  private authenticate(): void {
    const { tokenId, tokenSecret } = this.config;
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    
    // Create HMAC signature
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
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as RelayMessage;
      
      switch (message.type) {
        case "auth_success":
          console.log("[claw-ui] Authenticated with relay");
          this.authenticated = true;
          break;
          
        case "auth_error":
          console.error(`[claw-ui] Authentication failed: ${message.error}`);
          this.disconnect();
          break;
          
        case "message":
          // Inbound message from web client
          this.handleInboundMessage(message);
          break;
          
        case "ping":
          this.send({ type: "pong" });
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
    
    if (this.config.onMessage) {
      await this.config.onMessage(senderId, content);
    }
    
    // Route to OpenClaw's inbound message handler
    // This integrates with the standard channel inbound flow
    try {
      const runtime = this.config.runtime;
      // The runtime should have an inbound message handler
      // This will be provided by OpenClaw when the plugin is loaded
      console.log(`[claw-ui] Routing message from ${senderId} to agent`);
    } catch (err) {
      console.error(`[claw-ui] Failed to route inbound message: ${err}`);
    }
  }

  /**
   * Send message to a specific web client
   */
  async sendToClient(clientId: string, message: unknown): Promise<void> {
    if (!this.authenticated) {
      throw new Error("Not authenticated with relay");
    }
    
    this.send({
      type: "message",
      targetId: clientId,
      content: message,
    });
  }

  /**
   * Send raw message to relay
   */
  private send(message: RelayMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[claw-ui] Max reconnect attempts reached");
      return;
    }
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    
    console.log(`[claw-ui] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.connect().catch((err) => {
        console.error(`[claw-ui] Reconnect failed: ${err.message}`);
      });
    }, delay);
  }
}
