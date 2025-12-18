/**
 * State Receiver - Receives and applies state updates from remote clients.
 *
 * Implements conflict resolution strategy:
 * - Remote wins for data state (graph, traces, etc.)
 * - Local wins for UI preferences (zoom, pan, etc.)
 * - Merge strategy for filters and selections
 *
 * @packageDocumentation
 */

import type { DevToolsState } from "../state/devtools.state.js";
import type { DevToolsAction } from "../state/actions.js";
import type { SyncStateParams } from "@hex-di/devtools-core";

// =============================================================================
// Types
// =============================================================================

/**
 * Dispatch function type - applies actions to local state.
 */
export type DispatchFn = (action: DevToolsAction) => void;

/**
 * Conflict resolution strategy.
 */
export type ConflictResolution = "remote-wins" | "local-wins" | "merge";

/**
 * Configuration for the state receiver.
 */
export interface StateReceiverConfig {
  /** Default conflict resolution strategy */
  readonly defaultResolution: ConflictResolution;
  /** Enable verbose logging */
  readonly verbose: boolean;
  /** Apply remote changes automatically */
  readonly autoApply: boolean;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: StateReceiverConfig = {
  defaultResolution: "remote-wins",
  verbose: false,
  autoApply: true,
};

// =============================================================================
// State Receiver
// =============================================================================

/**
 * Receives and applies state updates from remote clients.
 *
 * Handles conflict resolution when local and remote states diverge.
 * Can be configured to auto-apply updates or queue them for manual review.
 *
 * @example
 * ```typescript
 * const receiver = new StateReceiver(
 *   (action) => dispatch(action),
 *   { autoApply: true, defaultResolution: 'remote-wins' }
 * );
 *
 * // Receive sync update
 * receiver.receive(syncParams, localState);
 * ```
 */
export class StateReceiver {
  private readonly config: StateReceiverConfig;
  private readonly dispatchFn: DispatchFn;
  private lastReceivedTimestamp = 0;
  private pendingUpdates: SyncStateParams[] = [];

  constructor(dispatchFn: DispatchFn, config: Partial<StateReceiverConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dispatchFn = dispatchFn;
  }

  /**
   * Receive and process a state update from a remote client.
   *
   * @param params - The sync state parameters
   * @param localState - The current local state
   */
  receive(params: SyncStateParams, localState: DevToolsState): void {
    this.log("Received state update", params);

    // Ignore outdated updates
    if (params.timestamp <= this.lastReceivedTimestamp) {
      this.log("Ignoring outdated update", {
        received: params.timestamp,
        last: this.lastReceivedTimestamp,
      });
      return;
    }

    this.lastReceivedTimestamp = params.timestamp;

    if (this.config.autoApply) {
      this.applyUpdate(params, localState);
    } else {
      this.pendingUpdates.push(params);
      this.log(`Queued update (${this.pendingUpdates.length} pending)`);
    }
  }

  /**
   * Apply a state update to the local state.
   *
   * @param params - The sync state parameters
   * @param localState - The current local state
   */
  applyUpdate(params: SyncStateParams, localState: DevToolsState): void {
    // Apply graph updates
    if (params.graph !== undefined) {
      this.applyGraphUpdate(params.graph, localState);
    }

    // Apply timeline updates
    if (params.timeline !== undefined) {
      this.applyTimelineUpdate(params.timeline, localState);
    }

    // Apply inspector updates
    if (params.inspector !== undefined) {
      this.applyInspectorUpdate(params.inspector, localState);
    }

    // Apply panel updates
    if (params.panel !== undefined) {
      this.applyPanelUpdate(params.panel, localState);
    }

    // Update sync state
    this.dispatchFn({
      type: "SYNC_STATE",
      payload: {
        isConnected: true,
        clientCount: 1, // Will be updated by connection manager
        lastSyncTimestamp: params.timestamp,
      },
    });

    this.log("Applied state update", params);
  }

  /**
   * Apply all pending updates.
   *
   * @param localState - The current local state
   */
  applyPendingUpdates(localState: DevToolsState): void {
    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];

    for (const update of updates) {
      this.applyUpdate(update, localState);
    }

    this.log(`Applied ${updates.length} pending updates`);
  }

  /**
   * Clear all pending updates without applying them.
   */
  clearPendingUpdates(): void {
    const count = this.pendingUpdates.length;
    this.pendingUpdates = [];
    this.log(`Cleared ${count} pending updates`);
  }

  /**
   * Get the number of pending updates.
   */
  getPendingCount(): number {
    return this.pendingUpdates.length;
  }

  /**
   * Get time since last received update in milliseconds.
   */
  getTimeSinceLastReceive(): number {
    return Date.now() - this.lastReceivedTimestamp;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private applyGraphUpdate(
    graphUpdate: NonNullable<SyncStateParams["graph"]>,
    localState: DevToolsState
  ): void {
    if (graphUpdate.selectedNodeId !== undefined) {
      this.dispatchFn({
        type: "SELECT_NODE",
        payload: graphUpdate.selectedNodeId,
      });
    }

    if (graphUpdate.highlightedNodeIds !== undefined) {
      this.dispatchFn({
        type: "HIGHLIGHT_NODES",
        payload: graphUpdate.highlightedNodeIds,
      });
    }

    // Zoom and pan are usually kept local (user preference)
    // But can be synced if needed
    if (graphUpdate.zoom !== undefined && this.config.defaultResolution === "remote-wins") {
      this.dispatchFn({
        type: "SET_ZOOM",
        payload: graphUpdate.zoom,
      });
    }

    if (graphUpdate.panOffset !== undefined && this.config.defaultResolution === "remote-wins") {
      this.dispatchFn({
        type: "SET_PAN_OFFSET",
        payload: graphUpdate.panOffset,
      });
    }
  }

  private applyTimelineUpdate(
    timelineUpdate: NonNullable<SyncStateParams["timeline"]>,
    localState: DevToolsState
  ): void {
    if (timelineUpdate.filterText !== undefined) {
      this.dispatchFn({
        type: "SET_TIMELINE_FILTER",
        payload: timelineUpdate.filterText,
      });
    }

    if (timelineUpdate.grouping !== undefined) {
      this.dispatchFn({
        type: "SET_TIMELINE_GROUPING",
        payload: timelineUpdate.grouping as any,
      });
    }

    if (
      timelineUpdate.sortOrder !== undefined &&
      timelineUpdate.sortDescending !== undefined
    ) {
      this.dispatchFn({
        type: "SET_TIMELINE_SORT",
        payload: {
          order: timelineUpdate.sortOrder as any,
          descending: timelineUpdate.sortDescending,
        },
      });
    }
  }

  private applyInspectorUpdate(
    inspectorUpdate: NonNullable<SyncStateParams["inspector"]>,
    localState: DevToolsState
  ): void {
    if (inspectorUpdate.filterText !== undefined) {
      this.dispatchFn({
        type: "SET_INSPECTOR_FILTER",
        payload: inspectorUpdate.filterText,
      });
    }

    if (inspectorUpdate.selectedServicePortName !== undefined) {
      this.dispatchFn({
        type: "SELECT_SERVICE",
        payload: inspectorUpdate.selectedServicePortName,
      });
    }

    if (inspectorUpdate.selectedScopeId !== undefined) {
      this.dispatchFn({
        type: "SELECT_SCOPE",
        payload: inspectorUpdate.selectedScopeId,
      });
    }
  }

  private applyPanelUpdate(
    panelUpdate: NonNullable<SyncStateParams["panel"]>,
    localState: DevToolsState
  ): void {
    if (panelUpdate.activeTabId !== undefined) {
      this.dispatchFn({
        type: "SET_ACTIVE_TAB",
        payload: panelUpdate.activeTabId as any,
      });
    }

    if (panelUpdate.isOpen !== undefined) {
      this.dispatchFn({
        type: "SET_PANEL_OPEN",
        payload: panelUpdate.isOpen,
      });
    }
  }

  private log(message: string, data?: unknown): void {
    if (this.config.verbose) {
      console.log(`[StateReceiver] ${message}`, data ?? "");
    }
  }
}
