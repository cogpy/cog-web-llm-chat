/**
 * Collaborative Editing Manager
 * Manages collaborative editing sessions with presence and conflict resolution
 */

import {
  RealtimeSyncManager,
  UserPresence,
  CollaborationConfig,
} from "./realtime-sync";
import { ConflictResolver, Change, Conflict } from "./conflict-resolution";

export interface CollaborativeSession {
  id: string;
  name: string;
  users: UserPresence[];
  createdAt: number;
  lastActivity: number;
}

export interface EditEvent {
  type: "edit" | "cursor" | "selection";
  userId: string;
  data: any;
  timestamp: number;
}

/**
 * Collaborative Editing Manager
 */
export class CollaborativeEditingManager {
  private syncManager: RealtimeSyncManager;
  private conflictResolver: ConflictResolver;
  private session: CollaborativeSession | null = null;
  private localChanges: Change[] = [];
  private remoteChanges: Change[] = [];
  private editHandlers: Set<(event: EditEvent) => void> = new Set();
  private presenceHandlers: Set<(users: UserPresence[]) => void> = new Set();

  constructor(config: CollaborationConfig) {
    this.syncManager = new RealtimeSyncManager(config);
    this.conflictResolver = new ConflictResolver("merge");

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for sync manager
   */
  private setupEventHandlers(): void {
    // Handle edits from other users
    this.syncManager.on("edit", (data) => {
      this.handleRemoteEdit(data);
    });

    // Handle cursor updates
    this.syncManager.on("cursor", (data) => {
      this.notifyEditHandlers({
        type: "cursor",
        userId: data.userId,
        data: data,
        timestamp: Date.now(),
      });
    });

    // Handle selection updates
    this.syncManager.on("selection", (data) => {
      this.notifyEditHandlers({
        type: "selection",
        userId: data.userId,
        data: data,
        timestamp: Date.now(),
      });
    });

    // Handle presence updates
    this.syncManager.on("presence-update", (users) => {
      this.notifyPresenceHandlers(users);
    });
  }

  /**
   * Start a collaborative session
   */
  async startSession(sessionName: string): Promise<boolean> {
    const connected = await this.syncManager.connect();

    if (connected) {
      this.session = {
        id: this.syncManager.getSessionId(),
        name: sessionName,
        users: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
    }

    return connected;
  }

  /**
   * End the collaborative session
   */
  endSession(): void {
    this.syncManager.disconnect();
    this.session = null;
    this.localChanges = [];
    this.remoteChanges = [];
  }

  /**
   * Make a local edit
   */
  makeEdit(change: Change): void {
    // Add to local changes
    this.localChanges.push(change);

    // Broadcast to others
    this.syncManager.broadcastUpdate("edit", change);

    // Update last activity
    if (this.session) {
      this.session.lastActivity = Date.now();
    }
  }

  /**
   * Handle remote edit
   */
  private handleRemoteEdit(data: any): void {
    const change: Change = data;
    this.remoteChanges.push(change);

    // Check for conflicts
    const conflicts = this.conflictResolver.detectConflicts(this.localChanges, [
      change,
    ]);

    if (conflicts.length > 0) {
      // Resolve conflicts
      conflicts.forEach((conflict) => {
        const resolved = this.conflictResolver.resolveConflict(conflict);
        if (resolved !== null) {
          // Apply resolved change
          this.notifyEditHandlers({
            type: "edit",
            userId: change.userId,
            data: { ...change, value: resolved },
            timestamp: Date.now(),
          });
        }
      });
    } else {
      // No conflict, apply change directly
      this.notifyEditHandlers({
        type: "edit",
        userId: change.userId,
        data: change,
        timestamp: Date.now(),
      });
    }

    // Update last activity
    if (this.session) {
      this.session.lastActivity = Date.now();
    }
  }

  /**
   * Update cursor position
   */
  updateCursor(x: number, y: number): void {
    this.syncManager.updateCursor(x, y);
  }

  /**
   * Update selection
   */
  updateSelection(selection: string[]): void {
    this.syncManager.updateSelection(selection);
  }

  /**
   * Get active users in the session
   */
  getActiveUsers(): UserPresence[] {
    return this.syncManager.getActiveUsers();
  }

  /**
   * Get session info
   */
  getSession(): CollaborativeSession | null {
    return this.session;
  }

  /**
   * Get unresolved conflicts
   */
  getConflicts(): Conflict[] {
    return this.conflictResolver.getUnresolvedConflicts();
  }

  /**
   * Manually resolve a conflict
   */
  resolveConflict(conflictId: string, resolvedValue: any): void {
    this.conflictResolver.manualResolve(conflictId, resolvedValue);
  }

  /**
   * Register an edit handler
   */
  onEdit(handler: (event: EditEvent) => void): void {
    this.editHandlers.add(handler);
  }

  /**
   * Unregister an edit handler
   */
  offEdit(handler: (event: EditEvent) => void): void {
    this.editHandlers.delete(handler);
  }

  /**
   * Register a presence handler
   */
  onPresence(handler: (users: UserPresence[]) => void): void {
    this.presenceHandlers.add(handler);
  }

  /**
   * Unregister a presence handler
   */
  offPresence(handler: (users: UserPresence[]) => void): void {
    this.presenceHandlers.delete(handler);
  }

  /**
   * Notify edit handlers
   */
  private notifyEditHandlers(event: EditEvent): void {
    this.editHandlers.forEach((handler) => handler(event));
  }

  /**
   * Notify presence handlers
   */
  private notifyPresenceHandlers(users: UserPresence[]): void {
    if (this.session) {
      this.session.users = users;
    }
    this.presenceHandlers.forEach((handler) => handler(users));
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.syncManager.isConnected();
  }

  /**
   * Get local changes
   */
  getLocalChanges(): Change[] {
    return [...this.localChanges];
  }

  /**
   * Get remote changes
   */
  getRemoteChanges(): Change[] {
    return [...this.remoteChanges];
  }

  /**
   * Clear change history
   */
  clearHistory(): void {
    this.localChanges = [];
    this.remoteChanges = [];
    this.conflictResolver.clearResolvedConflicts();
  }
}
