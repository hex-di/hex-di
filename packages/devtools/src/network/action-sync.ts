/**
 * Action Sync - Bidirectional action synchronization between clients.
 *
 * Enables TUI to trigger actions in browser and vice versa.
 * Handles action replay on reconnection and conflict resolution.
 *
 * @packageDocumentation
 */

import type { DevToolsAction } from "../state/actions.js";
import type { SyncActionParams } from "@hex-di/devtools-core";

// =============================================================================
// Types
// =============================================================================

/**
 * Send function type - sends action to remote clients.
 */
export type SendActionFn = (params: SyncActionParams) => void;

/**
 * Dispatch function type - applies action to local state.
 */
export type DispatchFn = (action: DevToolsAction) => void;

/**
 * Action entry in the history.
 */
export interface ActionHistoryEntry {
  readonly params: SyncActionParams;
  readonly timestamp: number;
  readonly applied: boolean;
}

/**
 * Configuration for action sync.
 */
export interface ActionSyncConfig {
  /** Client identifier (browser, tui-1, etc.) */
  readonly clientId: string;
  /** Maximum number of actions to keep in history */
  readonly maxHistorySize: number;
  /** Enable action replay on reconnection */
  readonly enableReplay: boolean;
  /** Enable verbose logging */
  readonly verbose: boolean;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: Partial<ActionSyncConfig> = {
  maxHistorySize: 100,
  enableReplay: true,
  verbose: false,
};

// =============================================================================
// Action Sync
// =============================================================================

/**
 * Manages bidirectional action synchronization between clients.
 *
 * Tracks action history for replay on reconnection.
 * Prevents action loops by tracking action sources.
 *
 * @example
 * ```typescript
 * const actionSync = new ActionSync(
 *   (params) => webSocket.send(JSON.stringify(params)),
 *   (action) => dispatch(action),
 *   { clientId: 'tui-1' }
 * );
 *
 * // Send action to remote
 * actionSync.sendAction({ type: 'SELECT_NODE', payload: 'node-1' });
 *
 * // Receive action from remote
 * actionSync.receiveAction(remoteParams);
 * ```
 */
export class ActionSync {
  private readonly config: ActionSyncConfig;
  private readonly sendFn: SendActionFn;
  private readonly dispatchFn: DispatchFn;
  private readonly history: ActionHistoryEntry[] = [];
  private lastActionTimestamp = 0;

  constructor(
    sendFn: SendActionFn,
    dispatchFn: DispatchFn,
    config: ActionSyncConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sendFn = sendFn;
    this.dispatchFn = dispatchFn;
  }

  /**
   * Send an action to remote clients.
   *
   * @param action - The action to send
   */
  sendAction(action: DevToolsAction): void {
    const params: SyncActionParams = {
      action: {
        type: action.type,
        payload: "payload" in action ? action.payload : undefined,
      },
      source: this.config.clientId,
      timestamp: Date.now(),
    };

    this.log("Sending action", params);
    this.sendFn(params);
    this.addToHistory(params, true);
    this.lastActionTimestamp = params.timestamp;
  }

  /**
   * Receive an action from a remote client.
   *
   * @param params - The sync action parameters
   */
  receiveAction(params: SyncActionParams): void {
    this.log("Received action", params);

    // Ignore actions from self (prevent loops)
    if (params.source === this.config.clientId) {
      this.log("Ignoring action from self");
      return;
    }

    // Ignore outdated actions
    if (params.timestamp <= this.lastActionTimestamp) {
      this.log("Ignoring outdated action", {
        received: params.timestamp,
        last: this.lastActionTimestamp,
      });
      return;
    }

    // Apply the action
    this.applyRemoteAction(params);
    this.addToHistory(params, true);
    this.lastActionTimestamp = params.timestamp;
  }

  /**
   * Replay actions from history (used after reconnection).
   *
   * @param fromTimestamp - Replay actions after this timestamp
   */
  replayActions(fromTimestamp: number): void {
    if (!this.config.enableReplay) {
      this.log("Replay disabled");
      return;
    }

    const actionsToReplay = this.history.filter(
      (entry) => entry.timestamp > fromTimestamp && entry.params.source === this.config.clientId
    );

    this.log(`Replaying ${actionsToReplay.length} actions`);

    for (const entry of actionsToReplay) {
      this.sendFn(entry.params);
    }
  }

  /**
   * Get action history.
   */
  getHistory(): readonly ActionHistoryEntry[] {
    return this.history;
  }

  /**
   * Clear action history.
   */
  clearHistory(): void {
    const count = this.history.length;
    this.history.length = 0;
    this.log(`Cleared ${count} actions from history`);
  }

  /**
   * Get the last action timestamp.
   */
  getLastActionTimestamp(): number {
    return this.lastActionTimestamp;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private applyRemoteAction(params: SyncActionParams): void {
    const action = params.action;

    // Map the action type to a DevToolsAction
    // This is a simplified implementation - in production, you'd need more robust type checking
    switch (action.type) {
      case "SELECT_NODE":
        this.dispatchFn({
          type: "SELECT_NODE",
          payload: action.payload as string | null,
        });
        break;

      case "SELECT_SERVICE":
        this.dispatchFn({
          type: "SELECT_SERVICE",
          payload: action.payload as string | null,
        });
        break;

      case "SELECT_SCOPE":
        this.dispatchFn({
          type: "SELECT_SCOPE",
          payload: action.payload as string | null,
        });
        break;

      case "SELECT_TRACE":
        this.dispatchFn({
          type: "SELECT_TRACE",
          payload: action.payload as string | null,
        });
        break;

      case "SET_TIMELINE_FILTER":
        this.dispatchFn({
          type: "SET_TIMELINE_FILTER",
          payload: action.payload as string,
        });
        break;

      case "SET_INSPECTOR_FILTER":
        this.dispatchFn({
          type: "SET_INSPECTOR_FILTER",
          payload: action.payload as string,
        });
        break;

      case "SET_ACTIVE_TAB":
        this.dispatchFn({
          type: "SET_ACTIVE_TAB",
          payload: action.payload as any,
        });
        break;

      case "TOGGLE_PANEL":
        this.dispatchFn({
          type: "TOGGLE_PANEL",
        });
        break;

      default:
        this.log(`Unknown action type: ${action.type}`);
    }

    // Store the remote action in state
    this.dispatchFn({
      type: "REMOTE_ACTION_RECEIVED",
      payload: {
        source: params.source,
        action: params.action,
        timestamp: params.timestamp,
      },
    });
  }

  private addToHistory(params: SyncActionParams, applied: boolean): void {
    this.history.push({
      params,
      timestamp: params.timestamp,
      applied,
    });

    // Trim history if it exceeds max size
    while (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  private log(message: string, data?: unknown): void {
    if (this.config.verbose) {
      console.log(`[ActionSync] ${message}`, data ?? "");
    }
  }
}
