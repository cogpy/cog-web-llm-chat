/**
 * CogServer Client
 * Interface for communicating with OpenCog CogServer
 */

import log from "loglevel";
import { CogServerConfig, CogServerCommand, CogServerResponse } from "./types";

export class CogServerClient {
  private config: CogServerConfig;
  private connection: WebSocket | null = null;
  private connected = false;
  private reconnectTimeout?: NodeJS.Timeout;
  private messageHandlers: Map<string, (response: CogServerResponse) => void> =
    new Map();

  constructor(config: CogServerConfig) {
    this.config = {
      reconnectInterval: 5000,
      ...config,
    };
  }

  /**
   * Connect to CogServer
   */
  async connect(): Promise<void> {
    if (this.connected) {
      log.warn("Already connected to CogServer");
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const url = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
        log.info(`Connecting to CogServer at ${url}`);

        this.connection = new WebSocket(url);

        this.connection.onopen = () => {
          this.connected = true;
          log.info("Connected to CogServer");
          resolve();
        };

        this.connection.onerror = (error) => {
          log.error("CogServer connection error:", error);
          reject(error);
        };

        this.connection.onclose = () => {
          this.connected = false;
          log.info("Disconnected from CogServer");

          if (this.config.reconnect) {
            this.scheduleReconnect();
          }
        };

        this.connection.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from CogServer
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    this.connected = false;
  }

  /**
   * Execute a command on CogServer
   */
  async execute(command: CogServerCommand): Promise<CogServerResponse> {
    if (!this.connected || !this.connection) {
      throw new Error("Not connected to CogServer");
    }

    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const payload = {
        id,
        ...command,
      };

      this.messageHandlers.set(id, (response) => {
        this.messageHandlers.delete(id);
        resolve(response);
      });

      try {
        this.connection!.send(JSON.stringify(payload));
      } catch (error) {
        this.messageHandlers.delete(id);
        reject(error);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.messageHandlers.has(id)) {
          this.messageHandlers.delete(id);
          reject(new Error("Command timeout"));
        }
      }, 30000);
    });
  }

  /**
   * Execute Atomese code
   */
  async executeAtomese(code: string): Promise<CogServerResponse> {
    return this.execute({
      command: "exec",
      args: [code],
      mode: "atomese",
    });
  }

  /**
   * Execute MeTTa code
   */
  async executeMetta(code: string): Promise<CogServerResponse> {
    return this.execute({
      command: "exec",
      args: [code],
      mode: "metta",
    });
  }

  /**
   * Execute Scheme code
   */
  async executeScheme(code: string): Promise<CogServerResponse> {
    return this.execute({
      command: "exec",
      args: [code],
      mode: "scheme",
    });
  }

  /**
   * Query the AtomSpace
   */
  async query(pattern: string): Promise<CogServerResponse> {
    return this.execute({
      command: "query",
      args: [pattern],
    });
  }

  /**
   * Get server status
   */
  async getStatus(): Promise<CogServerResponse> {
    return this.execute({
      command: "status",
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const handler = this.messageHandlers.get(message.id);

      if (handler) {
        const response: CogServerResponse = {
          success: message.success ?? true,
          result: message.result,
          error: message.error,
          timestamp: Date.now(),
        };
        handler(response);
      }
    } catch (error) {
      log.error("Failed to parse CogServer message:", error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      log.info("Attempting to reconnect to CogServer...");
      this.connect().catch((error) => {
        log.error("Reconnection failed:", error);
      });
    }, this.config.reconnectInterval);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Create a mock CogServer client for testing/demo purposes
 */
export class MockCogServerClient extends CogServerClient {
  constructor() {
    super({
      host: "localhost",
      port: 17001,
      protocol: "ws",
      reconnect: false,
    });
  }

  async connect(): Promise<void> {
    log.info("Mock CogServer client connected");
    return Promise.resolve();
  }

  async execute(command: CogServerCommand): Promise<CogServerResponse> {
    log.info("Mock execute:", command);
    return {
      success: true,
      result: `Mock result for command: ${command.command}`,
      timestamp: Date.now(),
    };
  }

  isConnected(): boolean {
    return true;
  }
}
