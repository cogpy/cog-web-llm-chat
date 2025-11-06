/**
 * Hyperon AtomSpace Synchronization
 * Synchronizes local AtomSpace with native Hyperon AtomSpace
 */

import { AtomNode, AtomType } from "../types";
import { getHyperonFFI, HyperonAtom } from "./ffi-bindings";

export interface SyncConfig {
  autoSync?: boolean;
  syncInterval?: number;
  bidirectional?: boolean;
  conflictResolution?: "local" | "remote" | "merge";
}

export interface SyncStatus {
  lastSync: number;
  atomsSynced: number;
  conflictsResolved: number;
  errors: number;
}

export interface SyncResult {
  success: boolean;
  added: number;
  updated: number;
  removed: number;
  conflicts: number;
  error?: string;
}

/**
 * AtomSpace Synchronization Manager
 */
export class AtomSpaceSynchronizer {
  private ffi = getHyperonFFI();
  private config: SyncConfig;
  private status: SyncStatus;
  private syncTimer: any = null;
  private localAtomSpace: Map<string, AtomNode> = new Map();
  private syncInProgress: boolean = false;

  constructor(config: SyncConfig = {}) {
    this.config = {
      autoSync: config.autoSync ?? false,
      syncInterval: config.syncInterval || 5000, // 5 seconds default
      bidirectional: config.bidirectional ?? true,
      conflictResolution: config.conflictResolution || "merge",
    };

    this.status = {
      lastSync: 0,
      atomsSynced: 0,
      conflictsResolved: 0,
      errors: 0,
    };
  }

  /**
   * Initialize the synchronizer
   */
  async initialize(): Promise<boolean> {
    const initialized = await this.ffi.initialize();

    if (initialized && this.config.autoSync) {
      this.startAutoSync();
    }

    return initialized;
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    if (this.syncTimer) {
      return; // Already running
    }

    this.syncTimer = setInterval(async () => {
      await this.synchronize();
    }, this.config.syncInterval);

    console.log("Auto-sync started");
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log("Auto-sync stopped");
    }
  }

  /**
   * Perform synchronization
   */
  async synchronize(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        added: 0,
        updated: 0,
        removed: 0,
        conflicts: 0,
        error: "Sync already in progress",
      };
    }

    this.syncInProgress = true;

    try {
      let result: SyncResult = {
        success: true,
        added: 0,
        updated: 0,
        removed: 0,
        conflicts: 0,
      };

      // Sync local to remote (push)
      const pushResult = await this.pushToHyperon();
      result.added += pushResult.added;
      result.updated += pushResult.updated;

      // Sync remote to local (pull) if bidirectional
      if (this.config.bidirectional) {
        const pullResult = await this.pullFromHyperon();
        result.added += pullResult.added;
        result.updated += pullResult.updated;
        result.conflicts = pullResult.conflicts;
      }

      // Update status
      this.status.lastSync = Date.now();
      this.status.atomsSynced += result.added + result.updated;
      this.status.conflictsResolved += result.conflicts;

      return result;
    } catch (error) {
      this.status.errors++;
      return {
        success: false,
        added: 0,
        updated: 0,
        removed: 0,
        conflicts: 0,
        error: String(error),
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Push local atoms to Hyperon
   */
  private async pushToHyperon(): Promise<SyncResult> {
    let added = 0;
    let updated = 0;

    for (const [id, atom] of this.localAtomSpace) {
      try {
        const hyperonAtom = this.convertToHyperonAtom(atom);
        const result = await this.ffi.addAtom(hyperonAtom);

        if (result.success) {
          if (result.data?.isNew) {
            added++;
          } else {
            updated++;
          }
        }
      } catch (error) {
        console.error(`Error pushing atom ${id}:`, error);
      }
    }

    return {
      success: true,
      added,
      updated,
      removed: 0,
      conflicts: 0,
    };
  }

  /**
   * Pull atoms from Hyperon to local
   */
  private async pullFromHyperon(): Promise<SyncResult> {
    let added = 0;
    let updated = 0;
    let conflicts = 0;

    try {
      // Query all atoms from Hyperon
      const result = await this.ffi.queryAtoms({ pattern: "*", limit: 10000 });

      if (!result.success) {
        return {
          success: false,
          added: 0,
          updated: 0,
          removed: 0,
          conflicts: 0,
          error: result.error,
        };
      }

      const hyperonAtoms: HyperonAtom[] = result.data || [];

      for (const hyperonAtom of hyperonAtoms) {
        const localAtom = this.convertFromHyperonAtom(hyperonAtom);
        const existing = this.localAtomSpace.get(hyperonAtom.id);

        if (!existing) {
          this.localAtomSpace.set(hyperonAtom.id, localAtom);
          added++;
        } else {
          // Handle conflict
          const resolved = this.resolveConflict(existing, localAtom);
          if (resolved) {
            this.localAtomSpace.set(hyperonAtom.id, resolved);
            updated++;
            if (resolved !== existing) {
              conflicts++;
            }
          }
        }
      }

      return {
        success: true,
        added,
        updated,
        removed: 0,
        conflicts,
      };
    } catch (error) {
      return {
        success: false,
        added: 0,
        updated: 0,
        removed: 0,
        conflicts: 0,
        error: String(error),
      };
    }
  }

  /**
   * Resolve conflict between local and remote atom
   */
  private resolveConflict(local: AtomNode, remote: AtomNode): AtomNode | null {
    switch (this.config.conflictResolution) {
      case "local":
        return local;

      case "remote":
        return remote;

      case "merge":
        // Merge truth values using revision formula
        if (local.truthValue && remote.truthValue) {
          const merged = this.mergeTruthValues(
            local.truthValue,
            remote.truthValue,
          );
          return {
            ...local,
            truthValue: merged,
          };
        }
        return remote;

      default:
        return local;
    }
  }

  /**
   * Merge truth values using probabilistic revision
   */
  private mergeTruthValues(tv1: any, tv2: any): any {
    const s1 = tv1.strength || 0;
    const c1 = tv1.confidence || 0;
    const s2 = tv2.strength || 0;
    const c2 = tv2.confidence || 0;

    // Revision formula
    const w1 = c1 / (1 - c1);
    const w2 = c2 / (1 - c2);
    const w = w1 + w2;

    const strength = (w1 * s1 + w2 * s2) / w;
    const confidence = w / (w + 1);

    return {
      strength,
      confidence,
    };
  }

  /**
   * Convert local atom to Hyperon atom
   */
  private convertToHyperonAtom(atom: AtomNode): HyperonAtom {
    return {
      id: `atom-${Date.now()}-${Math.random()}`,
      type: this.getAtomTypeName(atom.type),
      value: atom.name,
      children: atom.children?.map((child) => this.convertToHyperonAtom(child)),
      truthValue: atom.truthValue,
    };
  }

  /**
   * Convert Hyperon atom to local atom
   */
  private convertFromHyperonAtom(hyperonAtom: HyperonAtom): AtomNode {
    return {
      type: this.getAtomType(hyperonAtom.type),
      name: hyperonAtom.value,
      children: hyperonAtom.children?.map((child) =>
        this.convertFromHyperonAtom(child),
      ),
      truthValue: hyperonAtom.truthValue,
    };
  }

  /**
   * Get atom type name from enum
   */
  private getAtomTypeName(type: AtomType): string {
    return type || "UNKNOWN";
  }

  /**
   * Get atom type enum from name
   */
  private getAtomType(typeName: string): AtomType {
    // Try to find matching enum value
    const values = Object.values(AtomType);
    const found = values.find((v) => v === typeName);
    return found || AtomType.CONCEPT_NODE;
  }

  /**
   * Add atom to local space (will be synced on next sync)
   */
  addLocalAtom(atom: AtomNode): void {
    const id = `atom-${Date.now()}-${Math.random()}`;
    this.localAtomSpace.set(id, atom);
  }

  /**
   * Remove atom from local space
   */
  removeLocalAtom(atomId: string): void {
    this.localAtomSpace.delete(atomId);
  }

  /**
   * Get all local atoms
   */
  getLocalAtoms(): AtomNode[] {
    return Array.from(this.localAtomSpace.values());
  }

  /**
   * Clear local atom space
   */
  clearLocalAtoms(): void {
    this.localAtomSpace.clear();
  }

  /**
   * Get synchronization status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Reset synchronization status
   */
  resetStatus(): void {
    this.status = {
      lastSync: 0,
      atomsSynced: 0,
      conflictsResolved: 0,
      errors: 0,
    };
  }

  /**
   * Shutdown the synchronizer
   */
  async shutdown(): Promise<void> {
    this.stopAutoSync();
    this.localAtomSpace.clear();
    await this.ffi.shutdown();
  }
}

// Singleton instance
let synchronizerInstance: AtomSpaceSynchronizer | null = null;

/**
 * Get the AtomSpace synchronizer singleton
 */
export function getAtomSpaceSynchronizer(
  config?: SyncConfig,
): AtomSpaceSynchronizer {
  if (!synchronizerInstance) {
    synchronizerInstance = new AtomSpaceSynchronizer(config);
  }
  return synchronizerInstance;
}
