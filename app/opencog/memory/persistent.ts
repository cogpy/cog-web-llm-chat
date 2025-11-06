/**
 * Agent Memory System
 * Provides persistent memory storage for agents using IndexedDB
 */

import { nanoid } from "nanoid";
import log from "loglevel";

/**
 * Memory entry structure
 */
export interface MemoryEntry {
  id: string;
  agentId: string;
  type: "experience" | "knowledge" | "skill" | "context";
  content: any;
  timestamp: number;
  importance: number; // 0-1 scale
  accessCount: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

/**
 * Memory query parameters
 */
export interface MemoryQuery {
  agentId?: string;
  type?: MemoryEntry["type"];
  minImportance?: number;
  limit?: number;
  sortBy?: "timestamp" | "importance" | "accessCount";
  searchTerm?: string;
}

/**
 * IndexedDB-based memory storage
 */
export class PersistentMemory {
  private dbName: string = "OpenCogMemory";
  private dbVersion: number = 1;
  private storeName: string = "memories";
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB) {
      log.warn("IndexedDB not available - memory will not persist");
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        log.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        log.info("Memory database initialized");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: "id",
          });

          // Create indexes
          objectStore.createIndex("agentId", "agentId", { unique: false });
          objectStore.createIndex("type", "type", { unique: false });
          objectStore.createIndex("importance", "importance", {
            unique: false,
          });
          objectStore.createIndex("timestamp", "timestamp", { unique: false });

          log.info("Memory object store created");
        }
      };
    });
  }

  /**
   * Store a memory entry
   */
  async store(entry: Omit<MemoryEntry, "id">): Promise<string> {
    if (!this.db) {
      log.warn("Database not initialized");
      return "";
    }

    const memory: MemoryEntry = {
      id: nanoid(),
      ...entry,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(memory);

      request.onsuccess = () => {
        log.debug(`Stored memory: ${memory.id}`);
        resolve(memory.id);
      };

      request.onerror = () => {
        log.error("Failed to store memory:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve a specific memory by ID
   */
  async retrieve(id: string): Promise<MemoryEntry | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const memory = request.result as MemoryEntry | undefined;

        if (memory) {
          // Update access statistics
          memory.accessCount++;
          memory.lastAccessed = Date.now();
          store.put(memory);
        }

        resolve(memory || null);
      };

      request.onerror = () => {
        log.error("Failed to retrieve memory:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Query memories based on criteria
   */
  async query(params: MemoryQuery = {}): Promise<MemoryEntry[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as MemoryEntry[];

        // Apply filters
        if (params.agentId) {
          results = results.filter((m) => m.agentId === params.agentId);
        }

        if (params.type) {
          results = results.filter((m) => m.type === params.type);
        }

        if (params.minImportance !== undefined) {
          results = results.filter(
            (m) => m.importance >= params.minImportance!,
          );
        }

        if (params.searchTerm) {
          const term = params.searchTerm.toLowerCase();
          results = results.filter((m) => {
            const contentStr = JSON.stringify(m.content).toLowerCase();
            return contentStr.includes(term);
          });
        }

        // Sort
        const sortBy = params.sortBy || "timestamp";
        results.sort((a, b) => {
          if (sortBy === "timestamp") return b.timestamp - a.timestamp;
          if (sortBy === "importance") return b.importance - a.importance;
          if (sortBy === "accessCount") return b.accessCount - a.accessCount;
          return 0;
        });

        // Limit
        if (params.limit) {
          results = results.slice(0, params.limit);
        }

        resolve(results);
      };

      request.onerror = () => {
        log.error("Failed to query memories:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update a memory entry
   */
  async update(id: string, updates: Partial<MemoryEntry>): Promise<void> {
    if (!this.db) return;

    const memory = await this.retrieve(id);
    if (!memory) {
      log.warn(`Memory ${id} not found`);
      return;
    }

    const updated = { ...memory, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updated);

      request.onsuccess = () => {
        log.debug(`Updated memory: ${id}`);
        resolve();
      };

      request.onerror = () => {
        log.error("Failed to update memory:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a memory entry
   */
  async delete(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        log.debug(`Deleted memory: ${id}`);
        resolve();
      };

      request.onerror = () => {
        log.error("Failed to delete memory:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Consolidate memories - reduce low-importance, rarely accessed memories
   */
  async consolidate(): Promise<number> {
    const allMemories = await this.query({});
    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const memory of allMemories) {
      const age = now - memory.timestamp;
      const timeSinceAccess = now - memory.lastAccessed;

      // Delete if:
      // - Low importance AND old AND not accessed recently
      if (
        memory.importance < 0.3 &&
        age > ONE_WEEK &&
        timeSinceAccess > ONE_WEEK
      ) {
        await this.delete(memory.id);
        deletedCount++;
      }
    }

    log.info(`Memory consolidation: deleted ${deletedCount} memories`);
    return deletedCount;
  }

  /**
   * Get memory statistics
   */
  async getStatistics(): Promise<{
    totalMemories: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
    averageImportance: number;
  }> {
    const memories = await this.query({});

    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    let totalImportance = 0;

    for (const memory of memories) {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
      byAgent[memory.agentId] = (byAgent[memory.agentId] || 0) + 1;
      totalImportance += memory.importance;
    }

    return {
      totalMemories: memories.length,
      byType,
      byAgent,
      averageImportance:
        memories.length > 0 ? totalImportance / memories.length : 0,
    };
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        log.info("All memories cleared");
        resolve();
      };

      request.onerror = () => {
        log.error("Failed to clear memories:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      log.info("Memory database closed");
    }
  }
}
