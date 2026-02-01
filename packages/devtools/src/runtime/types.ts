/**
 * DevTools Runtime Core Types
 *
 * This module defines the core type system for the DevTools Runtime,
 * providing type-safe state management, commands, and events.
 *
 * The runtime follows a hybrid pattern:
 * - Commands for actions (dispatch pattern)
 * - Events for change notifications
 * - Selectors for derived state
 *
 * Plugin types are defined in `./plugin-types.ts` and re-exported here
 * for backward compatibility.
 *
 * @packageDocumentation
 */

import type { ContainerKind, InspectorAPI, InspectorEvent } from "@hex-di/core";

// =============================================================================
// Framework-Agnostic Plugin Types (from core)
// =============================================================================

export type {
  PluginShortcut,
  PluginMetadata,
  PluginDefinition,
  TabConfigCore,
  PluginCommand,
  PluginRuntimeAccess,
  PluginStateSnapshotCore,
  ContainerDiscoveryState,
  ContainerEntry,
  PluginConfigCore,
} from "./plugin-types-core.js";

// Import types for use in this file
import type { PluginMetadata, ContainerDiscoveryState } from "./plugin-types-core.js";

// =============================================================================
// Container Node Type (formerly in container-discovery.ts)
// =============================================================================

/**
 * Represents a discovered container in the DevTools tree.
 *
 * This type was formerly defined in container-discovery.ts but is now
 * defined here as the container discovery module has been removed.
 */
export interface ContainerNode {
  /** Unique identifier for the container */
  readonly containerId: string;
  /** Human-readable container name */
  readonly containerName: string;
  /** Container kind (root, child, lazy, scope) */
  readonly kind: ContainerKind;
  /** Path from root to this container */
  readonly path: readonly string[];
  /** Parent container ID, or null for root containers */
  readonly parentId: string | null;
  /** Inspector for this container */
  readonly inspector: InspectorAPI;
}

// =============================================================================
// Runtime State
// =============================================================================

/**
 * Immutable state managed by the DevTools runtime.
 *
 * All state mutations occur through `dispatch(command)` calls.
 * State is never mutated directly - each mutation creates a new state object.
 *
 * @example
 * ```typescript
 * const initialState: DevToolsRuntimeState = {
 *   activeTabId: "graph",
 *   selectedContainerIds: new Set(["container-1"]),
 *   tracingEnabled: true,
 *   tracingPaused: false,
 *   tracingThreshold: 100,
 *   plugins: Object.freeze([GraphPlugin, ServicesPlugin]),
 * };
 * ```
 */
export interface DevToolsRuntimeState<TPlugin extends PluginMetadata = PluginMetadata> {
  /** ID of the currently selected plugin tab */
  readonly activeTabId: string;
  /** Set of selected container IDs for multi-container support */
  readonly selectedContainerIds: ReadonlySet<string>;
  /** Whether tracing is globally enabled */
  readonly tracingEnabled: boolean;
  /** Whether tracing is paused (collection suspended) */
  readonly tracingPaused: boolean;
  /** Threshold in ms for marking resolutions as slow */
  readonly tracingThreshold: number;
  /** Registered plugins (immutable after runtime creation) */
  readonly plugins: readonly TPlugin[];
}

// =============================================================================
// Commands (Actions)
// =============================================================================

/**
 * Command to select a plugin tab.
 */
export interface SelectTabCommand {
  readonly type: "selectTab";
  /** ID of the tab to select */
  readonly tabId: string;
}

/**
 * Command to select one or more containers.
 */
export interface SelectContainersCommand {
  readonly type: "selectContainers";
  /** Set of container IDs to select */
  readonly ids: ReadonlySet<string>;
}

/**
 * Command to toggle tracing on/off.
 */
export interface ToggleTracingCommand {
  readonly type: "toggleTracing";
}

/**
 * Command to pause tracing collection.
 */
export interface PauseTracingCommand {
  readonly type: "pauseTracing";
}

/**
 * Command to resume tracing collection.
 */
export interface ResumeTracingCommand {
  readonly type: "resumeTracing";
}

/**
 * Command to set the slow resolution threshold.
 */
export interface SetThresholdCommand {
  readonly type: "setThreshold";
  /** Threshold value in milliseconds */
  readonly value: number;
}

/**
 * Command to clear all trace entries.
 */
export interface ClearTracesCommand {
  readonly type: "clearTraces";
}

/**
 * Discriminated union of all DevTools commands.
 *
 * Commands are the only way to mutate runtime state.
 * Use the `type` discriminant for exhaustive switch handling.
 *
 * @example
 * ```typescript
 * function handleCommand(command: DevToolsCommand): void {
 *   switch (command.type) {
 *     case "selectTab":
 *       console.log(`Selecting tab: ${command.tabId}`);
 *       break;
 *     case "selectContainers":
 *       console.log(`Selecting ${command.ids.size} containers`);
 *       break;
 *     case "toggleTracing":
 *       console.log("Toggling tracing");
 *       break;
 *     case "pauseTracing":
 *       console.log("Pausing tracing");
 *       break;
 *     case "resumeTracing":
 *       console.log("Resuming tracing");
 *       break;
 *     case "setThreshold":
 *       console.log(`Setting threshold: ${command.value}ms`);
 *       break;
 *     case "clearTraces":
 *       console.log("Clearing traces");
 *       break;
 *     default: {
 *       // Exhaustiveness check - this should never be reached
 *       const _exhaustive: never = command;
 *       throw new Error(`Unknown command: ${_exhaustive}`);
 *     }
 *   }
 * }
 * ```
 */
export type DevToolsCommand =
  | SelectTabCommand
  | SelectContainersCommand
  | ToggleTracingCommand
  | PauseTracingCommand
  | ResumeTracingCommand
  | SetThresholdCommand
  | ClearTracesCommand;

// =============================================================================
// Events (Notifications)
// =============================================================================

/**
 * Event emitted when the active tab changes.
 */
export interface TabChangedEvent {
  readonly type: "tabChanged";
  /** ID of the newly selected tab */
  readonly tabId: string;
}

/**
 * Event emitted when container selection changes.
 */
export interface ContainersSelectedEvent {
  readonly type: "containersSelected";
  /** Set of currently selected container IDs */
  readonly ids: ReadonlySet<string>;
}

/**
 * Event emitted when tracing state changes.
 */
export interface TracingStateChangedEvent {
  readonly type: "tracingStateChanged";
  /** Whether tracing is enabled */
  readonly enabled: boolean;
  /** Whether tracing is paused */
  readonly paused: boolean;
}

/**
 * Event emitted when traces are cleared.
 */
export interface TracesClearedEvent {
  readonly type: "tracesCleared";
}

/**
 * Discriminated union of all DevTools events.
 *
 * Events are emitted after state changes to notify subscribers.
 * Use the `type` discriminant for exhaustive switch handling.
 *
 * @example
 * ```typescript
 * function handleEvent(event: DevToolsEvent): void {
 *   switch (event.type) {
 *     case "tabChanged":
 *       console.log(`Tab changed to: ${event.tabId}`);
 *       break;
 *     case "containersSelected":
 *       console.log(`${event.ids.size} containers selected`);
 *       break;
 *     case "tracingStateChanged":
 *       console.log(`Tracing: enabled=${event.enabled}, paused=${event.paused}`);
 *       break;
 *     case "tracesCleared":
 *       console.log("Traces cleared");
 *       break;
 *     default: {
 *       // Exhaustiveness check - this should never be reached
 *       const _exhaustive: never = event;
 *       throw new Error(`Unknown event: ${_exhaustive}`);
 *     }
 *   }
 * }
 * ```
 */
export type DevToolsEvent =
  | TabChangedEvent
  | ContainersSelectedEvent
  | TracingStateChangedEvent
  | TracesClearedEvent;

// =============================================================================
// Runtime Interface
// =============================================================================

/**
 * Listener function for state changes.
 */
export type StateListener = () => void;

/**
 * Listener function for events.
 */
export type EventListener = (event: DevToolsEvent) => void;

/**
 * DevTools runtime interface.
 *
 * The runtime is the central hub for all DevTools state and operations.
 * It follows the `useSyncExternalStore` pattern for React integration.
 *
 * @example
 * ```typescript
 * // Create runtime with plugins
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin, ServicesPlugin],
 * });
 *
 * // Dispatch commands to mutate state
 * runtime.dispatch({ type: "selectTab", tabId: "services" });
 *
 * // Subscribe to state changes
 * const unsubscribe = runtime.subscribe(() => {
 *   console.log("State changed:", runtime.getState());
 * });
 *
 * // Use with React's useSyncExternalStore
 * const state = useSyncExternalStore(
 *   runtime.subscribe,
 *   runtime.getSnapshot,
 *   runtime.getServerSnapshot
 * );
 * ```
 */
export interface DevToolsRuntime {
  /**
   * Dispatch a command to mutate state.
   *
   * Commands are processed synchronously and state is updated immediately.
   * Subscribers are notified after state changes.
   *
   * @param command - The command to dispatch
   */
  dispatch(command: DevToolsCommand): void;

  /**
   * Subscribe to state changes.
   *
   * The listener is called whenever state changes (after any command).
   * Returns an unsubscribe function.
   *
   * @param listener - Callback invoked on state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener): () => void;

  /**
   * Subscribe to runtime events.
   *
   * Events provide more granular information about what changed.
   * Returns an unsubscribe function.
   *
   * @param listener - Callback invoked with events
   * @returns Unsubscribe function
   */
  subscribeToEvents(listener: EventListener): () => void;

  /**
   * Get the current state.
   *
   * Returns the same reference until state changes.
   * State is immutable - never modify the returned object.
   *
   * @returns Current immutable state
   */
  getState(): DevToolsRuntimeState;

  /**
   * Get a state snapshot for useSyncExternalStore.
   *
   * Returns the same reference as `getState()` but with semantics
   * optimized for React's concurrent rendering.
   *
   * @returns Current state snapshot
   */
  getSnapshot(): DevToolsRuntimeState;

  /**
   * Get a server-side state snapshot for SSR.
   *
   * Returns a stable state for server-side rendering scenarios.
   *
   * @returns Server state snapshot
   */
  getServerSnapshot(): DevToolsRuntimeState;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration options for creating a DevTools runtime.
 *
 * @example
 * ```typescript
 * const config: DevToolsRuntimeConfig = {
 *   plugins: [GraphPlugin, ServicesPlugin],
 *   maxEventsPerContainer: 500,
 *   maxTotalEvents: 5000,
 *   protectedEventTypes: ["error", "phase-changed"],
 * };
 * ```
 */
export interface DevToolsRuntimeConfig<TPlugin extends PluginMetadata = PluginMetadata> {
  /** Plugins to register (required, at least one) */
  readonly plugins: readonly TPlugin[];
  /** Initial active tab ID (defaults to first plugin's id) */
  readonly initialTabId?: string;
  /** Initial container selection */
  readonly initialContainerIds?: ReadonlySet<string>;
  /** Initial tracing enabled state */
  readonly tracingEnabled?: boolean;
  /** Initial tracing threshold in ms */
  readonly tracingThreshold?: number;

  // =========================================================================
  // Event Buffer Configuration
  // =========================================================================

  /**
   * Maximum events to buffer per container.
   *
   * Events are stored in a ring buffer and older events are evicted
   * when the limit is reached (unless protected).
   *
   * @default 500
   */
  readonly maxEventsPerContainer?: number;

  /**
   * Maximum total events across all containers.
   *
   * Provides a hard cap on memory usage regardless of container count.
   * When exceeded, oldest non-protected events are evicted first.
   *
   * @default 5000
   */
  readonly maxTotalEvents?: number;

  /**
   * Event types that are never evicted from the buffer.
   *
   * Protected events survive eviction and are only removed
   * when explicitly cleared or when their container is disposed.
   *
   * @default ["error", "phase-changed"]
   */
  readonly protectedEventTypes?: readonly string[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an object is a valid DevToolsCommand.
 */
export function isDevToolsCommand(value: unknown): value is DevToolsCommand {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const type = obj["type"];

  if (typeof type !== "string") {
    return false;
  }

  switch (type) {
    case "selectTab":
      return typeof obj["tabId"] === "string";
    case "selectContainers":
      return obj["ids"] instanceof Set;
    case "toggleTracing":
    case "pauseTracing":
    case "resumeTracing":
    case "clearTraces":
      return true;
    case "setThreshold":
      return typeof obj["value"] === "number";
    default:
      return false;
  }
}

/**
 * Type guard to check if an object is a valid DevToolsEvent.
 */
export function isDevToolsEvent(value: unknown): value is DevToolsEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const type = obj["type"];

  if (typeof type !== "string") {
    return false;
  }

  switch (type) {
    case "tabChanged":
      return typeof obj["tabId"] === "string";
    case "containersSelected":
      return obj["ids"] instanceof Set;
    case "tracingStateChanged":
      return typeof obj["enabled"] === "boolean" && typeof obj["paused"] === "boolean";
    case "tracesCleared":
      return true;
    default:
      return false;
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Extracts the command type string from DevToolsCommand.
 */
export type CommandType = DevToolsCommand["type"];

/**
 * Extracts the event type string from DevToolsEvent.
 */
export type EventType = DevToolsEvent["type"];

/**
 * Extracts a specific command by its type.
 */
export type ExtractCommand<T extends CommandType> = Extract<DevToolsCommand, { type: T }>;

/**
 * Extracts a specific event by its type.
 */
export type ExtractEvent<T extends EventType> = Extract<DevToolsEvent, { type: T }>;

// =============================================================================
// Container Lifecycle State Types
// =============================================================================

// ContainerDiscoveryState is now exported from plugin-types-core.ts

/**
 * Context data for a container's discovery state machine.
 *
 * Contains data needed for state transitions and error recovery.
 *
 * @example
 * ```typescript
 * const context: ContainerDiscoveryContext = {
 *   containerId: "app-root",
 *   retryCount: 0,
 * };
 * ```
 */
export interface ContainerDiscoveryContext {
  /** Unique identifier for the container */
  readonly containerId: string;
  /** Error from failed subscription attempt */
  readonly error?: Error;
  /** Number of retry attempts for error recovery */
  readonly retryCount: number;
}

// =============================================================================
// Tagged Container Event Types
// =============================================================================

/**
 * Union of all inspector event type strings.
 *
 * Used for filtering events in the event aggregator.
 */
export type InspectorEventType =
  | "resolution"
  | "scope-created"
  | "scope-disposed"
  | "child-created"
  | "child-disposed"
  | "phase-changed"
  | "snapshot-changed";

/**
 * An inspector event tagged with container metadata.
 *
 * Events from multiple containers are aggregated and tagged
 * with container information for filtering and display.
 *
 * @example
 * ```typescript
 * const taggedEvent: TaggedContainerEvent = {
 *   id: "evt-123",
 *   containerId: "app-root",
 *   containerPath: ["app-root"],
 *   containerName: "AppContainer",
 *   event: { type: "resolution", portName: "Logger", duration: 5, isCacheHit: false },
 *   timestamp: Date.now(),
 * };
 * ```
 */
export interface TaggedContainerEvent {
  /** Unique identifier for this tagged event */
  readonly id: string;
  /** ID of the container that emitted this event */
  readonly containerId: string;
  /** Path from root to this container (for hierarchy display) */
  readonly containerPath: readonly string[];
  /** Human-readable container name */
  readonly containerName: string;
  /** The underlying inspector event */
  readonly event: InspectorEvent;
  /** Timestamp when event was received (ms since epoch) */
  readonly timestamp: number;
}

/**
 * Filter criteria for querying tagged container events.
 *
 * All properties are optional; multiple criteria are ANDed together.
 *
 * @example
 * ```typescript
 * const filter: EventFilter = {
 *   containerIds: ["app-root"],
 *   eventTypes: ["resolution", "phase-changed"],
 *   slowThresholdMs: 50,
 * };
 * ```
 */
export interface EventFilter {
  /** Filter to events from specific containers */
  readonly containerIds?: readonly string[];
  /** Filter to specific event types */
  readonly eventTypes?: readonly InspectorEventType[];
  /** Filter to events within a time range */
  readonly timeRange?: {
    readonly start?: number;
    readonly end?: number;
  };
  /** Filter resolution events by port name (partial match) */
  readonly portName?: string;
  /** Filter resolution events slower than threshold (ms) */
  readonly slowThresholdMs?: number;
}

// =============================================================================
// Extended UI Commands (Task Group 5)
// =============================================================================

/**
 * Command to open the DevTools UI panel.
 */
export interface UIOpenCommand {
  readonly type: "ui.open";
}

/**
 * Command to close the DevTools UI panel.
 */
export interface UICloseCommand {
  readonly type: "ui.close";
}

/**
 * Command to toggle the DevTools UI panel open/closed.
 */
export interface UIToggleCommand {
  readonly type: "ui.toggle";
}

/**
 * Command to select a specific container.
 */
export interface UISelectContainerCommand {
  readonly type: "ui.selectContainer";
  readonly containerId: string;
}

/**
 * Command to toggle selection of a specific container.
 */
export interface UIToggleContainerCommand {
  readonly type: "ui.toggleContainer";
  readonly containerId: string;
}

/**
 * Command to expand a container in the tree view.
 */
export interface UIExpandContainerCommand {
  readonly type: "ui.expandContainer";
  readonly containerId: string;
}

/**
 * Command to collapse a container in the tree view.
 */
export interface UICollapseContainerCommand {
  readonly type: "ui.collapseContainer";
  readonly containerId: string;
}

/**
 * Union of all UI-related commands.
 */
export type UICommand =
  | UIOpenCommand
  | UICloseCommand
  | UIToggleCommand
  | UISelectContainerCommand
  | UIToggleContainerCommand
  | UIExpandContainerCommand
  | UICollapseContainerCommand;

// =============================================================================
// Extended Tracing Commands (Task Group 5)
// =============================================================================

/**
 * Command to set the event filter for tracing.
 */
export interface TracingSetFilterCommand {
  readonly type: "tracing.setFilter";
  readonly filter: EventFilter;
}

/**
 * Union of extended tracing commands.
 */
export type TracingFilterCommand = TracingSetFilterCommand;

// =============================================================================
// Extended DevTools Command (combines original + new commands)
// =============================================================================

/**
 * Extended command union including new UI and tracing commands.
 *
 * This extends the original DevToolsCommand with additional commands
 * for container management, UI state, and tracing filters.
 */
export type ExtendedDevToolsCommand = DevToolsCommand | UICommand | TracingFilterCommand;

// =============================================================================
// UI State Types (Task Group 5)
// =============================================================================

/**
 * State for DevTools UI panel.
 *
 * Tracks whether the panel is open, which containers are selected,
 * and which containers are expanded in the tree view.
 */
export interface UiState {
  /** Whether the DevTools panel is open */
  readonly isOpen: boolean;
  /** IDs of selected containers (for multi-select) */
  readonly selectedContainerIds: readonly string[];
  /** IDs of expanded containers in tree view */
  readonly expandedContainerIds: readonly string[];
}

// =============================================================================
// Tracing State Types (Task Group 5)
// =============================================================================

/**
 * State for tracing configuration.
 *
 * Tracks whether tracing is enabled, paused, and the current filter.
 */
export interface TracingState {
  /** Whether tracing is enabled */
  readonly enabled: boolean;
  /** Whether tracing is paused (events not collected) */
  readonly paused: boolean;
  /** Current event filter */
  readonly filter: EventFilter | null;
  /** Threshold in ms for marking resolutions as slow */
  readonly threshold: number;
}

// =============================================================================
// DevTools Runtime Snapshot (Task Group 5)
// =============================================================================

/**
 * Immutable snapshot of the DevTools runtime state.
 *
 * This snapshot includes all state needed for rendering and is
 * designed for use with `useSyncExternalStore`. All properties
 * are readonly to enforce immutability.
 *
 * @example
 * ```typescript
 * const snapshot = runtime.getContainerSnapshot();
 *
 * // Access container tree
 * for (const node of snapshot.containerTree) {
 *   console.log(`${node.containerName}: ${snapshot.containerStates.get(node.containerId)}`);
 * }
 *
 * // Access aggregated events
 * const recentEvents = snapshot.events.slice(-10);
 * ```
 */
export interface DevToolsRuntimeSnapshot {
  /** Discovered container tree */
  readonly containerTree: readonly ContainerNode[];
  /** Map of container ID to lifecycle state */
  readonly containerStates: ReadonlyMap<string, ContainerDiscoveryState>;
  /** Aggregated events from all containers */
  readonly events: readonly TaggedContainerEvent[];
  /** UI panel state */
  readonly uiState: UiState;
  /** Tracing configuration state */
  readonly tracingState: TracingState;
}

// =============================================================================
// DevTools Runtime with Containers Interface (Task Group 5)
// =============================================================================

/**
 * Extended DevTools runtime that includes container discovery and management.
 *
 * This interface extends the base DevToolsRuntime with methods for
 * container-aware state management and snapshot generation.
 */
export interface DevToolsRuntimeWithContainers extends DevToolsRuntime {
  /**
   * Dispatch an extended command.
   *
   * Accepts both original DevToolsCommands and extended UI/tracing commands.
   */
  dispatch(command: ExtendedDevToolsCommand): void;

  /**
   * Get the container-aware snapshot.
   *
   * Returns a snapshot including container tree, states, and events.
   * Suitable for use with `useSyncExternalStore`.
   */
  getContainerSnapshot(): DevToolsRuntimeSnapshot;

  /**
   * Dispose of the runtime and clean up resources.
   *
   * Unsubscribes from all container inspectors and clears internal state.
   */
  dispose(): void;
}
