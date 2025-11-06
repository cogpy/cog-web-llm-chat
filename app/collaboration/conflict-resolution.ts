/**
 * Conflict Resolution Strategies
 * Handles conflicts when multiple users edit the same data
 */

export interface Change {
  id: string;
  userId: string;
  timestamp: number;
  path: string[];
  operation: "add" | "update" | "delete";
  value?: any;
  previousValue?: any;
}

export interface Conflict {
  id: string;
  changes: Change[];
  resolution?: "local" | "remote" | "merge" | "manual";
  resolvedValue?: any;
}

export type ConflictResolutionStrategy =
  | "last-write-wins"
  | "first-write-wins"
  | "merge"
  | "manual";

/**
 * Conflict Resolver
 */
export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;
  private conflicts: Map<string, Conflict> = new Map();

  constructor(strategy: ConflictResolutionStrategy = "last-write-wins") {
    this.strategy = strategy;
  }

  /**
   * Detect conflicts between changes
   */
  detectConflicts(localChanges: Change[], remoteChanges: Change[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const pathMap = new Map<string, Change[]>();

    // Group changes by path
    [...localChanges, ...remoteChanges].forEach((change) => {
      const pathKey = change.path.join(".");
      if (!pathMap.has(pathKey)) {
        pathMap.set(pathKey, []);
      }
      pathMap.get(pathKey)!.push(change);
    });

    // Find conflicting paths (multiple changes to same path)
    pathMap.forEach((changes, path) => {
      if (changes.length > 1) {
        // Check if changes are actually conflicting
        const isConflicting = this.areChangesConflicting(changes);
        if (isConflicting) {
          conflicts.push({
            id: `conflict-${path}-${Date.now()}`,
            changes,
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Check if changes are conflicting
   */
  private areChangesConflicting(changes: Change[]): boolean {
    // Changes conflict if they have different operations or values
    // for the same path from different users
    const users = new Set(changes.map((c) => c.userId));
    if (users.size <= 1) {
      return false; // Same user, not a conflict
    }

    // Check if operations differ
    const operations = new Set(changes.map((c) => c.operation));
    if (operations.size > 1) {
      return true; // Different operations = conflict
    }

    // Check if values differ
    const values = changes.map((c) => JSON.stringify(c.value));
    const uniqueValues = new Set(values);
    if (uniqueValues.size > 1) {
      return true; // Different values = conflict
    }

    return false;
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(
    conflict: Conflict,
    strategy?: ConflictResolutionStrategy,
  ): any {
    const resolutionStrategy = strategy || this.strategy;

    switch (resolutionStrategy) {
      case "last-write-wins":
        return this.lastWriteWins(conflict);

      case "first-write-wins":
        return this.firstWriteWins(conflict);

      case "merge":
        return this.mergeChanges(conflict);

      case "manual":
        // Store for manual resolution
        this.conflicts.set(conflict.id, conflict);
        return null;

      default:
        return this.lastWriteWins(conflict);
    }
  }

  /**
   * Last-write-wins strategy
   */
  private lastWriteWins(conflict: Conflict): any {
    const sorted = [...conflict.changes].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    return sorted[0].value;
  }

  /**
   * First-write-wins strategy
   */
  private firstWriteWins(conflict: Conflict): any {
    const sorted = [...conflict.changes].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    return sorted[0].value;
  }

  /**
   * Merge strategy (combine changes)
   */
  private mergeChanges(conflict: Conflict): any {
    // Group changes by operation
    const adds = conflict.changes.filter((c) => c.operation === "add");
    const updates = conflict.changes.filter((c) => c.operation === "update");
    const deletes = conflict.changes.filter((c) => c.operation === "delete");

    // If any delete, prefer delete
    if (deletes.length > 0) {
      return undefined;
    }

    // Try to merge values
    if (updates.length > 0) {
      return this.mergeValues(updates.map((c) => c.value));
    }

    if (adds.length > 0) {
      return this.mergeValues(adds.map((c) => c.value));
    }

    return null;
  }

  /**
   * Merge multiple values intelligently
   */
  private mergeValues(values: any[]): any {
    if (values.length === 0) return null;
    if (values.length === 1) return values[0];

    const firstValue = values[0];

    // If primitive, use last-write-wins
    if (typeof firstValue !== "object" || firstValue === null) {
      return values[values.length - 1];
    }

    // If array, merge arrays
    if (Array.isArray(firstValue)) {
      const merged = new Set<any>();
      values.forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((item) => merged.add(item));
        }
      });
      return Array.from(merged);
    }

    // If object, merge objects
    const merged: any = {};
    values.forEach((obj) => {
      if (typeof obj === "object" && obj !== null) {
        Object.assign(merged, obj);
      }
    });

    return merged;
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): Conflict[] {
    return Array.from(this.conflicts.values()).filter(
      (c) => !c.resolution || c.resolution === "manual",
    );
  }

  /**
   * Manually resolve a conflict
   */
  manualResolve(conflictId: string, resolvedValue: any): void {
    const conflict = this.conflicts.get(conflictId);
    if (conflict) {
      conflict.resolution = "manual";
      conflict.resolvedValue = resolvedValue;
      this.conflicts.set(conflictId, conflict);
    }
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): void {
    const unresolved = new Map<string, Conflict>();
    this.conflicts.forEach((conflict, id) => {
      if (!conflict.resolution || conflict.resolution === "manual") {
        unresolved.set(id, conflict);
      }
    });
    this.conflicts = unresolved;
  }

  /**
   * Set resolution strategy
   */
  setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get resolution strategy
   */
  getStrategy(): ConflictResolutionStrategy {
    return this.strategy;
  }
}

/**
 * Operational Transformation (OT) for text editing
 */
export class OperationalTransform {
  /**
   * Transform an operation against another operation
   */
  static transform(op1: Change, op2: Change): Change {
    // Simplified OT for demonstration
    // In a real implementation, this would be more complex

    if (op1.path.join(".") !== op2.path.join(".")) {
      // Different paths, no transformation needed
      return op1;
    }

    // If both are updates, prefer later timestamp
    if (op1.operation === "update" && op2.operation === "update") {
      if (op1.timestamp > op2.timestamp) {
        return op1;
      } else {
        // Transform op1 based on op2
        return {
          ...op1,
          previousValue: op2.value,
        };
      }
    }

    // If one is delete, handle appropriately
    if (op2.operation === "delete") {
      // Can't update what's been deleted
      return {
        ...op1,
        operation: "add",
      };
    }

    return op1;
  }

  /**
   * Apply a transformation to a series of operations
   */
  static transformAll(operations: Change[], againstOp: Change): Change[] {
    return operations.map((op) => this.transform(op, againstOp));
  }
}

/**
 * CRDT-based conflict-free data structure
 */
export class CRDT {
  private data: Map<string, any> = new Map();
  private tombstones: Set<string> = new Set();

  /**
   * Add or update a value
   */
  set(key: string, value: any, timestamp: number): void {
    const existing = this.data.get(key);

    if (!existing || existing.timestamp < timestamp) {
      this.data.set(key, { value, timestamp });
      this.tombstones.delete(key);
    }
  }

  /**
   * Delete a value
   */
  delete(key: string, timestamp: number): void {
    const existing = this.data.get(key);

    if (!existing || existing.timestamp < timestamp) {
      this.tombstones.add(key);
      this.data.delete(key);
    }
  }

  /**
   * Get a value
   */
  get(key: string): any {
    if (this.tombstones.has(key)) {
      return undefined;
    }
    return this.data.get(key)?.value;
  }

  /**
   * Merge with another CRDT
   */
  merge(other: CRDT): void {
    // Merge data
    other.data.forEach((item, key) => {
      const existing = this.data.get(key);
      if (!existing || existing.timestamp < item.timestamp) {
        this.data.set(key, item);
        this.tombstones.delete(key);
      }
    });

    // Merge tombstones
    other.tombstones.forEach((key) => {
      this.tombstones.add(key);
      this.data.delete(key);
    });
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.data.keys()).filter(
      (key) => !this.tombstones.has(key),
    );
  }
}
