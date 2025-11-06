/**
 * FFI Bindings for OpenCog Hyperon Core
 * Provides a TypeScript interface to native Hyperon functionality
 */

import { AtomNode, TruthValue } from "../types";

export interface HyperonConfig {
  wasmPath?: string;
  nativeEnabled?: boolean;
  memoryLimit?: number;
  gcThreshold?: number;
}

export interface HyperonAtom {
  id: string;
  type: string;
  value?: any;
  children?: HyperonAtom[];
  truthValue?: TruthValue;
}

export interface HyperonQuery {
  pattern: string;
  variables?: Record<string, any>;
  limit?: number;
}

export interface HyperonResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

/**
 * FFI Bridge to Hyperon Core
 * This class provides the interface to native Hyperon functionality
 */
export class HyperonFFI {
  private config: HyperonConfig;
  private initialized: boolean = false;
  private wasmModule: any = null;
  private atomSpaceHandle: any = null;

  constructor(config: HyperonConfig = {}) {
    this.config = {
      wasmPath: config.wasmPath || "/hyperon/hyperon-core.wasm",
      nativeEnabled: config.nativeEnabled ?? false,
      memoryLimit: config.memoryLimit || 1024 * 1024 * 100, // 100MB default
      gcThreshold: config.gcThreshold || 0.8,
    };
  }

  /**
   * Initialize the Hyperon FFI bridge
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      if (this.config.nativeEnabled) {
        // Load WASM module
        await this.loadWasmModule();

        // Initialize AtomSpace
        this.atomSpaceHandle = this.wasmModule.createAtomSpace();

        this.initialized = true;
        console.log("Hyperon FFI initialized successfully");
        return true;
      } else {
        console.log("Hyperon FFI running in mock mode");
        this.initialized = true;
        return true;
      }
    } catch (error) {
      console.error("Failed to initialize Hyperon FFI:", error);
      return false;
    }
  }

  /**
   * Load the Hyperon WASM module
   */
  private async loadWasmModule(): Promise<void> {
    // In a real implementation, this would load the actual Hyperon WASM module
    // For now, we'll create a mock interface
    if (typeof WebAssembly !== "undefined") {
      try {
        const response = await fetch(this.config.wasmPath!);
        const buffer = await response.arrayBuffer();
        const wasmModule = await WebAssembly.instantiate(buffer);
        this.wasmModule = wasmModule.instance.exports;
      } catch (error) {
        console.warn("Failed to load Hyperon WASM, using mock:", error);
        this.wasmModule = this.createMockWasmInterface();
      }
    } else {
      this.wasmModule = this.createMockWasmInterface();
    }
  }

  /**
   * Create mock WASM interface for development
   */
  private createMockWasmInterface(): any {
    return {
      createAtomSpace: () => ({ id: "mock-atomspace" }),
      addAtom: (space: any, atom: any) => ({ id: `atom-${Date.now()}` }),
      removeAtom: (space: any, atomId: string) => true,
      queryAtoms: (space: any, query: any) => [],
      executeMetta: (space: any, code: string) => ({ result: null }),
      getAtomCount: (space: any) => 0,
      clearAtomSpace: (space: any) => true,
    };
  }

  /**
   * Add an atom to the Hyperon AtomSpace
   */
  async addAtom(atom: HyperonAtom): Promise<HyperonResult> {
    if (!this.initialized) {
      return { success: false, error: "FFI not initialized" };
    }

    try {
      const startTime = Date.now();
      const result = this.wasmModule.addAtom(this.atomSpaceHandle, atom);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Remove an atom from the Hyperon AtomSpace
   */
  async removeAtom(atomId: string): Promise<HyperonResult> {
    if (!this.initialized) {
      return { success: false, error: "FFI not initialized" };
    }

    try {
      const result = this.wasmModule.removeAtom(this.atomSpaceHandle, atomId);
      return { success: result };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Query atoms from the Hyperon AtomSpace
   */
  async queryAtoms(query: HyperonQuery): Promise<HyperonResult> {
    if (!this.initialized) {
      return { success: false, error: "FFI not initialized" };
    }

    try {
      const startTime = Date.now();
      const result = this.wasmModule.queryAtoms(this.atomSpaceHandle, query);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Execute MeTTa code in Hyperon
   */
  async executeMetta(code: string): Promise<HyperonResult> {
    if (!this.initialized) {
      return { success: false, error: "FFI not initialized" };
    }

    try {
      const startTime = Date.now();
      const result = this.wasmModule.executeMetta(this.atomSpaceHandle, code);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Get statistics about the AtomSpace
   */
  async getAtomSpaceStats(): Promise<HyperonResult> {
    if (!this.initialized) {
      return { success: false, error: "FFI not initialized" };
    }

    try {
      const atomCount = this.wasmModule.getAtomCount(this.atomSpaceHandle);
      return {
        success: true,
        data: {
          atomCount,
          memoryUsage: this.getMemoryUsage(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Clear the AtomSpace
   */
  async clearAtomSpace(): Promise<HyperonResult> {
    if (!this.initialized) {
      return { success: false, error: "FFI not initialized" };
    }

    try {
      const result = this.wasmModule.clearAtomSpace(this.atomSpaceHandle);
      return { success: result };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof performance !== "undefined" && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.initialized) {
      try {
        await this.clearAtomSpace();
        this.atomSpaceHandle = null;
        this.wasmModule = null;
        this.initialized = false;
        console.log("Hyperon FFI shut down successfully");
      } catch (error) {
        console.error("Error shutting down Hyperon FFI:", error);
      }
    }
  }

  /**
   * Check if FFI is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let hyperonFFIInstance: HyperonFFI | null = null;

/**
 * Get the Hyperon FFI singleton instance
 */
export function getHyperonFFI(config?: HyperonConfig): HyperonFFI {
  if (!hyperonFFIInstance) {
    hyperonFFIInstance = new HyperonFFI(config);
  }
  return hyperonFFIInstance;
}
