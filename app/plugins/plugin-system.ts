/**
 * Plugin System Architecture
 * Manages plugins with sandboxed execution and capability-based security
 */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: string[];
  permissions: PluginPermission[];
  entryPoint: string;
  dependencies?: Record<string, string>;
  icon?: string;
  homepage?: string;
  repository?: string;
}

export interface PluginPermission {
  type: "storage" | "network" | "filesystem" | "opencog" | "llm";
  scope?: string;
  description: string;
}

export interface PluginContext {
  pluginId: string;
  storage: PluginStorage;
  api: PluginAPI;
  capabilities: Set<string>;
}

export interface PluginAPI {
  log: (message: string) => void;
  error: (message: string) => void;
  getConfig: (key: string) => any;
  setConfig: (key: string, value: any) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
}

export interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export type PluginStatus = "installed" | "enabled" | "disabled" | "error";

export interface InstalledPlugin {
  manifest: PluginManifest;
  status: PluginStatus;
  instance?: any;
  installedAt: number;
  lastEnabled?: number;
  error?: string;
}

/**
 * Plugin Manager
 */
export class PluginManager {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private capabilityRegistry: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeCapabilities();
  }

  /**
   * Initialize capability registry
   */
  private initializeCapabilities(): void {
    // Define standard capabilities
    const capabilities = [
      "agent:create",
      "agent:execute",
      "atomspace:read",
      "atomspace:write",
      "translation:nl-to-metta",
      "translation:metta-to-nl",
      "reasoning:pln",
      "reasoning:ecan",
      "storage:local",
      "storage:remote",
      "network:http",
      "network:websocket",
      "ui:panel",
      "ui:toolbar",
    ];

    capabilities.forEach((cap) => {
      this.capabilityRegistry.set(cap, new Set());
    });
  }

  /**
   * Install a plugin
   */
  async installPlugin(manifest: PluginManifest): Promise<boolean> {
    try {
      // Validate manifest
      if (!this.validateManifest(manifest)) {
        throw new Error("Invalid plugin manifest");
      }

      // Check for conflicts
      if (this.plugins.has(manifest.id)) {
        throw new Error(`Plugin ${manifest.id} is already installed`);
      }

      // Verify permissions
      if (!this.verifyPermissions(manifest.permissions)) {
        throw new Error("Required permissions not granted");
      }

      // Create plugin entry
      const plugin: InstalledPlugin = {
        manifest,
        status: "installed",
        installedAt: Date.now(),
      };

      this.plugins.set(manifest.id, plugin);

      // Register capabilities
      manifest.capabilities.forEach((cap) => {
        if (this.capabilityRegistry.has(cap)) {
          this.capabilityRegistry.get(cap)!.add(manifest.id);
        }
      });

      console.log(`Plugin ${manifest.name} installed successfully`);
      return true;
    } catch (error) {
      console.error("Failed to install plugin:", error);
      return false;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Disable if enabled
      if (plugin.status === "enabled") {
        await this.disablePlugin(pluginId);
      }

      // Unregister capabilities
      plugin.manifest.capabilities.forEach((cap) => {
        this.capabilityRegistry.get(cap)?.delete(pluginId);
      });

      // Remove from registry
      this.plugins.delete(pluginId);

      console.log(`Plugin ${plugin.manifest.name} uninstalled successfully`);
      return true;
    } catch (error) {
      console.error("Failed to uninstall plugin:", error);
      return false;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (plugin.status === "enabled") {
        return true; // Already enabled
      }

      // Create plugin context
      const context = this.createPluginContext(plugin.manifest);

      // Load and instantiate plugin
      const instance = await this.loadPlugin(plugin.manifest, context);

      // Initialize plugin
      if (instance.initialize) {
        await instance.initialize(context);
      }

      // Update plugin status
      plugin.instance = instance;
      plugin.status = "enabled";
      plugin.lastEnabled = Date.now();
      plugin.error = undefined;

      this.plugins.set(pluginId, plugin);

      console.log(`Plugin ${plugin.manifest.name} enabled successfully`);
      return true;
    } catch (error) {
      console.error("Failed to enable plugin:", error);

      // Update error status
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        plugin.status = "error";
        plugin.error = String(error);
        this.plugins.set(pluginId, plugin);
      }

      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (plugin.status !== "enabled") {
        return true; // Already disabled
      }

      // Shutdown plugin
      if (plugin.instance?.shutdown) {
        await plugin.instance.shutdown();
      }

      // Update status
      plugin.instance = undefined;
      plugin.status = "disabled";

      this.plugins.set(pluginId, plugin);

      console.log(`Plugin ${plugin.manifest.name} disabled successfully`);
      return true;
    } catch (error) {
      console.error("Failed to disable plugin:", error);
      return false;
    }
  }

  /**
   * Load plugin code in sandbox
   */
  private async loadPlugin(
    manifest: PluginManifest,
    context: PluginContext,
  ): Promise<any> {
    // In a real implementation, this would load the plugin in a sandboxed environment
    // For now, we'll create a mock plugin instance

    return {
      initialize: async (ctx: PluginContext) => {
        console.log(`Initializing plugin ${manifest.name}`);
      },
      shutdown: async () => {
        console.log(`Shutting down plugin ${manifest.name}`);
      },
      execute: async (command: string, args: any) => {
        console.log(`Executing ${command} in plugin ${manifest.name}`);
        return { success: true };
      },
    };
  }

  /**
   * Create plugin context with sandboxed API
   */
  private createPluginContext(manifest: PluginManifest): PluginContext {
    const storage: PluginStorage = {
      get: async (key: string) => {
        const stored = localStorage.getItem(`plugin:${manifest.id}:${key}`);
        return stored ? JSON.parse(stored) : null;
      },
      set: async (key: string, value: any) => {
        localStorage.setItem(
          `plugin:${manifest.id}:${key}`,
          JSON.stringify(value),
        );
      },
      delete: async (key: string) => {
        localStorage.removeItem(`plugin:${manifest.id}:${key}`);
      },
      clear: async () => {
        const prefix = `plugin:${manifest.id}:`;
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        });
      },
    };

    const api: PluginAPI = {
      log: (message: string) => {
        console.log(`[Plugin:${manifest.id}]`, message);
      },
      error: (message: string) => {
        console.error(`[Plugin:${manifest.id}]`, message);
      },
      getConfig: (key: string) => {
        return null; // Implement config management
      },
      setConfig: (key: string, value: any) => {
        // Implement config management
      },
      emit: (event: string, data: any) => {
        this.emitPluginEvent(manifest.id, event, data);
      },
      on: (event: string, handler: (data: any) => void) => {
        this.onPluginEvent(manifest.id, event, handler);
      },
    };

    return {
      pluginId: manifest.id,
      storage,
      api,
      capabilities: new Set(manifest.capabilities),
    };
  }

  /**
   * Emit plugin event
   */
  private emitPluginEvent(pluginId: string, event: string, data: any): void {
    const key = `${pluginId}:${event}`;
    const handlers = this.eventHandlers.get(key);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Register plugin event handler
   */
  private onPluginEvent(
    pluginId: string,
    event: string,
    handler: Function,
  ): void {
    const key = `${pluginId}:${event}`;
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key)!.add(handler);
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): boolean {
    return !!(
      manifest.id &&
      manifest.name &&
      manifest.version &&
      manifest.entryPoint &&
      manifest.capabilities
    );
  }

  /**
   * Verify plugin permissions
   */
  private verifyPermissions(permissions: PluginPermission[]): boolean {
    // In a real implementation, this would check user-granted permissions
    // For now, we'll approve all permissions
    return true;
  }

  /**
   * Get all installed plugins
   */
  getInstalledPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values()).filter(
      (p) => p.status === "enabled",
    );
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugins by capability
   */
  getPluginsByCapability(capability: string): InstalledPlugin[] {
    const pluginIds = this.capabilityRegistry.get(capability);
    if (!pluginIds) return [];

    return Array.from(pluginIds)
      .map((id) => this.plugins.get(id))
      .filter((p): p is InstalledPlugin => p !== undefined);
  }

  /**
   * Execute plugin command
   */
  async executePluginCommand(
    pluginId: string,
    command: string,
    args: any,
  ): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== "enabled") {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }

    if (!plugin.instance?.execute) {
      throw new Error(`Plugin ${pluginId} does not support execution`);
    }

    return await plugin.instance.execute(command, args);
  }
}

// Singleton instance
let pluginManagerInstance: PluginManager | null = null;

/**
 * Get plugin manager singleton
 */
export function getPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
  }
  return pluginManagerInstance;
}
