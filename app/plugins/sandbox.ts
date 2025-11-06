/**
 * Sandboxed Execution Environment
 * Provides isolated execution for plugins with security controls
 */

export interface SandboxConfig {
  maxMemory?: number; // MB
  maxCPUTime?: number; // ms
  allowedAPIs?: string[];
  networkAccess?: boolean;
  storageAccess?: boolean;
}

export interface ExecutionContext {
  plugin: string;
  timeout: number;
  memory: number;
  startTime: number;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  stats?: {
    duration: number;
    memoryUsed: number;
    cpuTime: number;
  };
}

/**
 * Sandbox Environment
 */
export class SandboxEnvironment {
  private config: Required<SandboxConfig>;
  private activeContexts: Map<string, ExecutionContext> = new Map();

  constructor(config: SandboxConfig = {}) {
    this.config = {
      maxMemory: config.maxMemory || 50, // 50MB default
      maxCPUTime: config.maxCPUTime || 5000, // 5 seconds default
      allowedAPIs: config.allowedAPIs || [
        "console.log",
        "console.error",
        "Math",
        "Date",
        "JSON",
      ],
      networkAccess: config.networkAccess ?? false,
      storageAccess: config.storageAccess ?? true,
    };
  }

  /**
   * Execute code in sandbox
   */
  async execute(
    pluginId: string,
    code: string,
    context?: any,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const execContext: ExecutionContext = {
      plugin: pluginId,
      timeout: this.config.maxCPUTime,
      memory: 0,
      startTime,
    };

    this.activeContexts.set(pluginId, execContext);

    try {
      // Create sandboxed context
      const sandboxedContext = this.createSandboxedContext(context);

      // Wrap code in timeout
      const result = await this.executeWithTimeout(
        code,
        sandboxedContext,
        this.config.maxCPUTime,
      );

      const duration = Date.now() - startTime;

      // Clean up
      this.activeContexts.delete(pluginId);

      return {
        success: true,
        result,
        stats: {
          duration,
          memoryUsed: execContext.memory,
          cpuTime: duration,
        },
      };
    } catch (error) {
      this.activeContexts.delete(pluginId);

      return {
        success: false,
        error: String(error),
        stats: {
          duration: Date.now() - startTime,
          memoryUsed: execContext.memory,
          cpuTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Create sandboxed context with limited APIs
   */
  private createSandboxedContext(userContext?: any): any {
    const sandbox: any = {
      console: {
        log: (...args: any[]) => {
          if (this.config.allowedAPIs.includes("console.log")) {
            console.log("[Sandbox]", ...args);
          }
        },
        error: (...args: any[]) => {
          if (this.config.allowedAPIs.includes("console.error")) {
            console.error("[Sandbox]", ...args);
          }
        },
      },
    };

    // Add Math if allowed
    if (this.config.allowedAPIs.includes("Math")) {
      sandbox.Math = Math;
    }

    // Add Date if allowed
    if (this.config.allowedAPIs.includes("Date")) {
      sandbox.Date = Date;
    }

    // Add JSON if allowed
    if (this.config.allowedAPIs.includes("JSON")) {
      sandbox.JSON = JSON;
    }

    // Add user context
    if (userContext) {
      Object.assign(sandbox, userContext);
    }

    return sandbox;
  }

  /**
   * Execute code with timeout
   */
  private async executeWithTimeout(
    code: string,
    context: any,
    timeout: number,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Execution timeout"));
      }, timeout);

      try {
        // Create function from code
        const func = new Function(...Object.keys(context), code);

        // Execute
        const result = func(...Object.values(context));

        clearTimeout(timer);

        // Handle promises
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Validate code before execution
   */
  validateCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(/,
      /import\s+/,
      /export\s+/,
      /__proto__/,
      /constructor\s*\[/,
    ];

    dangerousPatterns.forEach((pattern, index) => {
      if (pattern.test(code)) {
        errors.push(`Dangerous pattern detected: ${pattern.source}`);
      }
    });

    // Check for restricted globals
    const restrictedGlobals = [
      "window",
      "document",
      "process",
      "global",
      "eval",
      "Function",
    ];

    restrictedGlobals.forEach((global) => {
      const regex = new RegExp(`\\b${global}\\b`);
      if (regex.test(code)) {
        errors.push(`Access to restricted global: ${global}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get active execution contexts
   */
  getActiveContexts(): ExecutionContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * Terminate execution for a plugin
   */
  terminateExecution(pluginId: string): boolean {
    const context = this.activeContexts.get(pluginId);
    if (context) {
      this.activeContexts.delete(pluginId);
      return true;
    }
    return false;
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get sandbox configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}

/**
 * Web Worker-based Sandbox (for better isolation)
 */
export class WorkerSandbox {
  private workers: Map<string, Worker> = new Map();

  /**
   * Execute code in a Web Worker
   */
  async executeInWorker(
    pluginId: string,
    code: string,
    timeout: number = 5000,
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      // Create worker blob
      const blob = new Blob(
        [
          `
        self.onmessage = function(e) {
          try {
            const result = (function() {
              ${code}
            })();
            self.postMessage({ success: true, result });
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `,
        ],
        { type: "application/javascript" },
      );

      const worker = new Worker(URL.createObjectURL(blob));
      this.workers.set(pluginId, worker);

      const timer = setTimeout(() => {
        worker.terminate();
        this.workers.delete(pluginId);
        resolve({
          success: false,
          error: "Execution timeout",
        });
      }, timeout);

      worker.onmessage = (e) => {
        clearTimeout(timer);
        worker.terminate();
        this.workers.delete(pluginId);

        resolve({
          success: e.data.success,
          result: e.data.result,
          error: e.data.error,
        });
      };

      worker.onerror = (error) => {
        clearTimeout(timer);
        worker.terminate();
        this.workers.delete(pluginId);

        resolve({
          success: false,
          error: error.message,
        });
      };

      worker.postMessage({});
    });
  }

  /**
   * Terminate worker for plugin
   */
  terminateWorker(pluginId: string): boolean {
    const worker = this.workers.get(pluginId);
    if (worker) {
      worker.terminate();
      this.workers.delete(pluginId);
      return true;
    }
    return false;
  }

  /**
   * Terminate all workers
   */
  terminateAll(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers.clear();
  }
}

// Singleton instances
let sandboxInstance: SandboxEnvironment | null = null;
let workerSandboxInstance: WorkerSandbox | null = null;

/**
 * Get sandbox environment singleton
 */
export function getSandbox(config?: SandboxConfig): SandboxEnvironment {
  if (!sandboxInstance) {
    sandboxInstance = new SandboxEnvironment(config);
  }
  return sandboxInstance;
}

/**
 * Get worker sandbox singleton
 */
export function getWorkerSandbox(): WorkerSandbox {
  if (!workerSandboxInstance) {
    workerSandboxInstance = new WorkerSandbox();
  }
  return workerSandboxInstance;
}
