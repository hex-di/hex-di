/**
 * State Broadcaster - Broadcasts state changes from browser to TUI clients.
 *
 * Implements intelligent debouncing strategy:
 * - Immediate broadcast for selection changes (critical for UX)
 * - Debounced broadcast for filter/preference changes (reduce noise)
 *
 * @packageDocumentation
 */

import type { DevToolsState } from "../state/devtools.state.js";
import type { SyncStateParams } from "@hex-di/devtools-core";

// =============================================================================
// Types
// =============================================================================

/**
 * Broadcast function type - sends sync state to all connected clients.
 */
export type BroadcastFn = (params: SyncStateParams) => void;

/**
 * Configuration for the state broadcaster.
 */
export interface StateBroadcasterConfig {
  /** Debounce delay for non-critical updates (ms) */
  readonly debounceDelayMs: number;
  /** Enable verbose logging */
  readonly verbose: boolean;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: StateBroadcasterConfig = {
  debounceDelayMs: 300,
  verbose: false,
};

// =============================================================================
// State Broadcaster
// =============================================================================

/**
 * Broadcasts state changes with intelligent debouncing.
 *
 * Selection changes are sent immediately for responsive UX.
 * Filter and preference changes are debounced to reduce message traffic.
 *
 * @example
 * ```typescript
 * const broadcaster = new StateBroadcaster(
 *   (params) => webSocket.send(JSON.stringify(params)),
 *   { debounceDelayMs: 300 }
 * );
 *
 * // Immediate broadcast (selection)
 * broadcaster.broadcastImmediate(state);
 *
 * // Debounced broadcast (filters)
 * broadcaster.broadcastDebounced(state);
 * ```
 */
export class StateBroadcaster {
  private readonly config: StateBroadcasterConfig;
  private readonly broadcastFn: BroadcastFn;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastBroadcastTime = 0;
  private pendingState: Partial<DevToolsState> | null = null;

  constructor(broadcastFn: BroadcastFn, config: Partial<StateBroadcasterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.broadcastFn = broadcastFn;
  }

  /**
   * Broadcast state changes immediately (for critical updates like selections).
   *
   * @param state - The current DevTools state
   * @param changes - Specific changes to broadcast (if null, extracts from state)
   */
  broadcastImmediate(state: DevToolsState, changes?: Partial<DevToolsState>): void {
    const syncParams = this.createSyncParams(changes ?? state, "immediate");
    this.log("Broadcasting immediate update", syncParams);
    this.broadcastFn(syncParams);
    this.lastBroadcastTime = Date.now();
  }

  /**
   * Broadcast state changes with debouncing (for non-critical updates like filters).
   *
   * @param state - The current DevTools state
   * @param changes - Specific changes to broadcast (if null, extracts from state)
   */
  broadcastDebounced(state: DevToolsState, changes?: Partial<DevToolsState>): void {
    // Accumulate changes
    this.pendingState = { ...this.pendingState, ...(changes ?? state) };

    // Clear existing timer
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      if (this.pendingState !== null) {
        const syncParams = this.createSyncParams(this.pendingState, "debounced");
        this.log("Broadcasting debounced update", syncParams);
        this.broadcastFn(syncParams);
        this.lastBroadcastTime = Date.now();
        this.pendingState = null;
      }
      this.debounceTimer = null;
    }, this.config.debounceDelayMs);
  }

  /**
   * Broadcast selection changes immediately.
   *
   * @param state - The current DevTools state
   */
  broadcastSelection(state: DevToolsState): void {
    const selectionChanges: Partial<DevToolsState> = {
      graph: {
        selectedNodeId: state.graph.selectedNodeId,
        highlightedNodeIds: state.graph.highlightedNodeIds,
        zoom: state.graph.zoom,
        panOffset: state.graph.panOffset,
        direction: state.graph.direction,
      },
      inspector: {
        selectedServicePortName: state.inspector.selectedServicePortName,
        selectedScopeId: state.inspector.selectedScopeId,
        filterText: state.inspector.filterText,
        showDependencies: state.inspector.showDependencies,
        showDependents: state.inspector.showDependents,
        expandedScopeIds: state.inspector.expandedScopeIds,
      },
      timeline: {
        selectedEntryId: state.timeline.selectedEntryId,
        expandedEntryIds: state.timeline.expandedEntryIds,
        filterText: state.timeline.filterText,
        grouping: state.timeline.grouping,
        sortOrder: state.timeline.sortOrder,
        sortDescending: state.timeline.sortDescending,
        showOnlyCacheHits: state.timeline.showOnlyCacheHits,
        showOnlySlow: state.timeline.showOnlySlow,
        slowThresholdMs: state.timeline.slowThresholdMs,
        isPaused: state.timeline.isPaused,
      },
    };

    this.broadcastImmediate(state, selectionChanges);
  }

  /**
   * Broadcast filter changes with debouncing.
   *
   * @param state - The current DevTools state
   */
  broadcastFilters(state: DevToolsState): void {
    const filterChanges: Partial<DevToolsState> = {
      timeline: {
        filterText: state.timeline.filterText,
        grouping: state.timeline.grouping,
        sortOrder: state.timeline.sortOrder,
        sortDescending: state.timeline.sortDescending,
        showOnlyCacheHits: state.timeline.showOnlyCacheHits,
        showOnlySlow: state.timeline.showOnlySlow,
        slowThresholdMs: state.timeline.slowThresholdMs,
        isPaused: state.timeline.isPaused,
        selectedEntryId: state.timeline.selectedEntryId,
        expandedEntryIds: state.timeline.expandedEntryIds,
      },
      inspector: {
        filterText: state.inspector.filterText,
        showDependencies: state.inspector.showDependencies,
        showDependents: state.inspector.showDependents,
        selectedServicePortName: state.inspector.selectedServicePortName,
        selectedScopeId: state.inspector.selectedScopeId,
        expandedScopeIds: state.inspector.expandedScopeIds,
      },
    };

    this.broadcastDebounced(state, filterChanges);
  }

  /**
   * Flush any pending debounced updates immediately.
   */
  flush(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;

      if (this.pendingState !== null) {
        const syncParams = this.createSyncParams(this.pendingState, "immediate");
        this.log("Flushing pending update", syncParams);
        this.broadcastFn(syncParams);
        this.lastBroadcastTime = Date.now();
        this.pendingState = null;
      }
    }
  }

  /**
   * Cancel any pending debounced updates.
   */
  cancel(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingState = null;
  }

  /**
   * Get time since last broadcast in milliseconds.
   */
  getTimeSinceLastBroadcast(): number {
    return Date.now() - this.lastBroadcastTime;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private createSyncParams(
    state: Partial<DevToolsState>,
    priority: "immediate" | "debounced"
  ): SyncStateParams {
    return {
      timestamp: Date.now(),
      priority,
      ...(state.graph !== undefined && {
        graph: {
          selectedNodeId: state.graph.selectedNodeId,
          highlightedNodeIds: state.graph.highlightedNodeIds,
          zoom: state.graph.zoom,
          panOffset: state.graph.panOffset,
        },
      }),
      ...(state.timeline !== undefined && {
        timeline: {
          filterText: state.timeline.filterText,
          grouping: state.timeline.grouping,
          sortOrder: state.timeline.sortOrder,
          sortDescending: state.timeline.sortDescending,
        },
      }),
      ...(state.inspector !== undefined && {
        inspector: {
          filterText: state.inspector.filterText,
          selectedServicePortName: state.inspector.selectedServicePortName,
          selectedScopeId: state.inspector.selectedScopeId,
        },
      }),
      ...(state.panel !== undefined && {
        panel: {
          activeTabId: state.panel.activeTabId,
          isOpen: state.panel.isOpen,
        },
      }),
    };
  }

  private log(message: string, data?: unknown): void {
    if (this.config.verbose) {
      console.log(`[StateBroadcaster] ${message}`, data ?? "");
    }
  }
}
