/**
 * WebSocket-Based Real-Time Synchronization
 * Enables real-time collaboration between multiple users
 */

export interface CollaborationMessage {
  type: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  data: any;
}

export interface UserPresence {
  userId: string;
  name: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: string[];
  lastSeen: number;
  status: "active" | "idle" | "offline";
}

export interface CollaborationConfig {
  serverUrl: string;
  sessionId: string;
  userId: string;
  userName: string;
  reconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * Real-Time Sync Manager
 */
export class RealtimeSyncManager {
  private config: CollaborationConfig;
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectCount: number = 0;
  private heartbeatTimer: any = null;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private presenceMap: Map<string, UserPresence> = new Map();

  constructor(config: CollaborationConfig) {
    this.config = {
      ...config,
      reconnectAttempts: config.reconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  /**
   * Connect to the collaboration server
   */
  async connect(): Promise<boolean> {
    try {
      const url = `${this.config.serverUrl}?session=${this.config.sessionId}&user=${this.config.userId}`;
      this.ws = new WebSocket(url);

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket not initialized"));
          return;
        }

        this.ws.onopen = () => {
          console.log("Connected to collaboration server");
          this.connected = true;
          this.reconnectCount = 0;
          this.startHeartbeat();

          // Send join message
          this.send({
            type: "join",
            userId: this.config.userId,
            sessionId: this.config.sessionId,
            timestamp: Date.now(),
            data: {
              name: this.config.userName,
            },
          });

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("Disconnected from collaboration server");
          this.connected = false;
          this.stopHeartbeat();
          this.attemptReconnect();
        };
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      return false;
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.ws) {
      // Send leave message
      this.send({
        type: "leave",
        userId: this.config.userId,
        sessionId: this.config.sessionId,
        timestamp: Date.now(),
        data: {},
      });

      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.stopHeartbeat();
  }

  /**
   * Send a message to all collaborators
   */
  send(message: CollaborationMessage): void {
    if (!this.connected || !this.ws) {
      console.warn("Not connected, message not sent");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  /**
   * Broadcast an update to all collaborators
   */
  broadcastUpdate(type: string, data: any): void {
    this.send({
      type,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Register a message handler
   */
  on(messageType: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  /**
   * Unregister a message handler
   */
  off(messageType: string, handler: (data: any) => void): void {
    this.messageHandlers.get(messageType)?.delete(handler);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: CollaborationMessage = JSON.parse(data);

      // Update presence
      if (message.type === "presence") {
        this.updatePresence(message.data);
      }

      // Notify handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach((handler) => handler(message.data));
      }

      // Notify wildcard handlers
      const wildcardHandlers = this.messageHandlers.get("*");
      if (wildcardHandlers) {
        wildcardHandlers.forEach((handler) => handler(message));
      }
    } catch (error) {
      console.error("Failed to handle message:", error);
    }
  }

  /**
   * Update user presence
   */
  private updatePresence(presence: UserPresence): void {
    this.presenceMap.set(presence.userId, {
      ...presence,
      lastSeen: Date.now(),
    });

    // Emit presence update
    const handlers = this.messageHandlers.get("presence-update");
    if (handlers) {
      handlers.forEach((handler) =>
        handler(Array.from(this.presenceMap.values())),
      );
    }
  }

  /**
   * Update own cursor position
   */
  updateCursor(x: number, y: number): void {
    this.broadcastUpdate("cursor", { x, y });
  }

  /**
   * Update own selection
   */
  updateSelection(selection: string[]): void {
    this.broadcastUpdate("selection", { selection });
  }

  /**
   * Get all active users
   */
  getActiveUsers(): UserPresence[] {
    const now = Date.now();
    const timeout = 60000; // 1 minute

    return Array.from(this.presenceMap.values()).filter(
      (user) => now - user.lastSeen < timeout,
    );
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: "heartbeat",
        userId: this.config.userId,
        sessionId: this.config.sessionId,
        timestamp: Date.now(),
        data: {},
      });
    }, this.config.heartbeatInterval!);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectCount >= this.config.reconnectAttempts!) {
      console.error("Max reconnect attempts reached");
      return;
    }

    this.reconnectCount++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectCount), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("Reconnect failed:", error);
      }
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.config.sessionId;
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    return this.config.userId;
  }
}

/**
 * Create a mock collaboration server for development
 */
export class MockCollaborationServer {
  private sessions: Map<string, Set<any>> = new Map();

  constructor() {
    console.log("Mock collaboration server started");
  }

  /**
   * Simulate a WebSocket connection
   */
  createMockWebSocket(sessionId: string, userId: string): any {
    // This would be implemented with a proper mock WebSocket
    // For now, return a simple event emitter
    return {
      send: (data: string) => {
        console.log("Mock send:", data);
      },
      close: () => {
        console.log("Mock close");
      },
    };
  }
}
