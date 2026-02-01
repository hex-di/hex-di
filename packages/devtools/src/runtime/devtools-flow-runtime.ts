/**
 * DevToolsFlowRuntime
 *
 * Singleton coordinator that owns three FlowService instances and provides
 * a unified API for React integration via useSyncExternalStore.
 *
 * @packageDocumentation
 */

import {
  createMachineRunner,
  createActivityManager,
  createBasicExecutor,
  type MachineRunner,
  type ActivityManager,
  type TypedEventSink,
  type EventOf,
} from "@hex-di/flow";
import type { InspectorAPI } from "@hex-di/core";
import {
  devToolsUIMachine,
  type DevToolsUIState,
  type DevToolsUIContext,
  type DevToolsUIEvent,
  tracingMachine,
  type TracingState,
  type TracingContext,
  type TracingEvent,
  containerTreeMachine,
  type ContainerTreeState,
  type ContainerTreeContext,
  type ContainerTreeEvent,
  ContainerDiscoveryActivity,
  ContainerDiscoveryEvents,
  ContainerSubscriptionActivity,
  ContainerSubscriptionEvents,
  type InspectorRef,
} from "@hex-di/devtools-core";
import type { DevToolsSnapshot, DevToolsFlowEvent } from "./devtools-snapshot.js";

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for creating a DevToolsFlowRuntime.
 */
export interface DevToolsFlowRuntimeConfig {
  /**
   * The root inspector for the container hierarchy.
   *
   * The runtime uses this inspector to:
   * - Spawn ContainerDiscoveryActivity for recursive container discovery
   * - Traverse the container tree via getChildContainers()
   * - Look up inspectors by container ID
   */
  readonly inspector: InspectorAPI;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Typed machine runner for UI machine.
 */
type UIRunner = MachineRunner<
  DevToolsUIState,
  { readonly type: DevToolsUIEvent },
  DevToolsUIContext
>;

/**
 * Typed machine runner for Tracing machine.
 */
type TracingRunner = MachineRunner<TracingState, { readonly type: TracingEvent }, TracingContext>;

/**
 * Typed machine runner for ContainerTree machine.
 */
type ContainerTreeRunner = MachineRunner<
  ContainerTreeState,
  { readonly type: ContainerTreeEvent },
  ContainerTreeContext
>;

// =============================================================================
// Type-Safe Event Helpers
// =============================================================================

/**
 * Full UI event with type and optional payload.
 * Used for cross-machine event forwarding where the payload structure
 * is known at compile time.
 */
interface FullUIEvent {
  readonly type: DevToolsUIEvent;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * Sends an event to the UI machine with an isolated type cast.
 *
 * SAFETY: This function exists to isolate the `as unknown as` cast needed
 * at the machine boundary. The Flow library's `MachineRunner.send()` type
 * is narrower than the actual event acceptance (it only declares `{ type: E }`
 * but actually accepts full events with payloads).
 *
 * All callers construct events via the `UIEventBuilders` to ensure
 * correct structure at compile time.
 *
 * @param runner - The UI machine runner
 * @param event - The fully-typed event with payload
 */
function sendUIEvent(runner: UIRunner, event: FullUIEvent): void {
  // SAFETY: Cast documented above. Event is always constructed via builders.
  runner.send(event as { readonly type: DevToolsUIEvent });
}

/**
 * Type-safe event builders for cross-machine communication.
 * These ensure events are correctly structured at compile time.
 */
const UIEventBuilders = {
  /**
   * Builds a CONTAINER_REGISTERED event for the UI machine.
   */
  containerRegistered: (entry: {
    readonly id: string;
    readonly label: string;
    readonly kind: string;
    readonly parentId: string | null;
  }): FullUIEvent => ({
    type: "CONTAINER_REGISTERED",
    payload: { entry },
  }),

  /**
   * Builds a CONTAINER_UNREGISTERED event for the UI machine.
   */
  containerUnregistered: (id: string): FullUIEvent => ({
    type: "CONTAINER_UNREGISTERED",
    payload: { id },
  }),
} as const;

// =============================================================================
// Container Discovery Event Types
// =============================================================================

/**
 * Union type of all events emitted by ContainerDiscoveryActivity.
 *
 * Derived from ContainerDiscoveryEvents via EventOf utility type.
 * Events are FLAT (e.g., `{ type: "CONTAINER_ADDED", entry: ... }`),
 * not nested with payload property.
 */
type ContainerDiscoveryEventUnion = EventOf<typeof ContainerDiscoveryEvents>;

// =============================================================================
// Event Routing
// =============================================================================

/**
 * Event prefix to machine mapping for routing.
 */
type EventPrefix = "UI" | "TRACING" | "CONTAINER_TREE";

/**
 * Extracts the prefix from an event type.
 */
function getEventPrefix(eventType: string): EventPrefix | null {
  if (eventType.startsWith("UI.")) {
    return "UI";
  }
  if (eventType.startsWith("TRACING.")) {
    return "TRACING";
  }
  if (eventType.startsWith("CONTAINER_TREE.")) {
    return "CONTAINER_TREE";
  }
  return null;
}

/**
 * Strips the prefix from an event type to get the machine-local event.
 */
function stripEventPrefix(eventType: string): string {
  const dotIndex = eventType.indexOf(".");
  if (dotIndex === -1) {
    return eventType;
  }
  return eventType.slice(dotIndex + 1);
}

// =============================================================================
// Container Discovery Event Routing - Discriminated Union Narrowing
// =============================================================================

// Debug logging helper - no-op in production
// For debugging, temporarily replace with: const debugLog = console.log.bind(console, '[HexDI]');
const debugLog: (...args: unknown[]) => void = () => {
  // No-op - debugging disabled in production
};

/**
 * Routes ContainerDiscoveryActivity events to the machine with prefix transformation.
 *
 * Uses discriminated union narrowing - TypeScript automatically knows which
 * properties exist after the switch statement on `event.type`.
 *
 * @param event - The flat activity event (e.g., `{ type: "CONTAINER_ADDED", entry: ... }`)
 * @param dispatch - The dispatch function for DevToolsFlowRuntime
 */
function routeContainerDiscoveryEvent(
  event: ContainerDiscoveryEventUnion,
  dispatch: (event: DevToolsFlowEvent) => void
): void {
  switch (event.type) {
    case "CONTAINER_ADDED":
      // TypeScript narrows: event is { type: "CONTAINER_ADDED"; entry: ContainerTreeEntry }
      debugLog(
        "[routeContainerDiscoveryEvent] CONTAINER_ADDED:",
        event.entry.id,
        event.entry.label
      );
      dispatch({
        type: "CONTAINER_TREE.CONTAINER_ADDED",
        payload: { entry: event.entry },
      });
      break;

    case "DISCOVERY_COMPLETE":
      // TypeScript narrows: event is { type: "DISCOVERY_COMPLETE" }
      debugLog("[routeContainerDiscoveryEvent] DISCOVERY_COMPLETE");
      dispatch({ type: "CONTAINER_TREE.DISCOVERY_COMPLETE" });
      break;

    case "DISCOVERY_ERROR":
      // TypeScript narrows: event is { type: "DISCOVERY_ERROR"; error: Error }
      debugLog("[routeContainerDiscoveryEvent] DISCOVERY_ERROR:", event.error);
      dispatch({
        type: "CONTAINER_TREE.DISCOVERY_ERROR",
        payload: { error: event.error },
      });
      break;
  }
}

/**
 * Creates a TypedEventSink that routes ContainerDiscoveryActivity events.
 *
 * The activity uses event object form: `sink.emit(ContainerDiscoveryEvents.SOMETHING(...))`.
 * This factory creates a type-safe sink that routes those events to the machine.
 *
 * @param dispatch - The dispatch function for DevToolsFlowRuntime
 * @returns A typed event sink compatible with ContainerDiscoveryActivity
 */
function createContainerDiscoverySink(
  dispatch: (event: DevToolsFlowEvent) => void
): TypedEventSink<typeof ContainerDiscoveryEvents> {
  return {
    emit(...args) {
      // Activity uses: sink.emit(ContainerDiscoveryEvents.SOMETHING(...))
      // This is always the event object form (args[0] is the full event object)
      const eventOrType = args[0];
      if (typeof eventOrType !== "string") {
        routeContainerDiscoveryEvent(eventOrType, dispatch);
      }
      // String form is not used by ContainerDiscoveryActivity
    },
  };
}

// =============================================================================
// Container Subscription Event Routing
// =============================================================================

/**
 * Union type of all events emitted by ContainerSubscriptionActivity.
 */
type ContainerSubscriptionEventUnion = EventOf<typeof ContainerSubscriptionEvents>;

/**
 * Routes ContainerSubscriptionActivity events to the FSM.
 *
 * @param event - The flat activity event
 * @param dispatch - The dispatch function for DevToolsFlowRuntime
 */
function routeContainerSubscriptionEvent(
  event: ContainerSubscriptionEventUnion,
  dispatch: (event: DevToolsFlowEvent) => void
): void {
  switch (event.type) {
    case "CONTAINER_UPDATED":
      debugLog("[routeSubscriptionEvent] CONTAINER_UPDATED:", event.entry.id);
      dispatch({
        type: "CONTAINER_TREE.CONTAINER_UPDATED",
        payload: { entry: event.entry },
      });
      break;

    case "CONTAINER_DISPOSED":
      debugLog("[routeSubscriptionEvent] CONTAINER_DISPOSED:", event.containerId);
      dispatch({
        type: "CONTAINER_TREE.CONTAINER_DISPOSED",
        payload: { containerId: event.containerId },
      });
      break;

    case "CHILD_CONTAINER_CREATED":
      debugLog("[routeSubscriptionEvent] CHILD_CONTAINER_CREATED:", event.entry.id);
      dispatch({
        type: "CONTAINER_TREE.CONTAINER_ADDED",
        payload: { entry: event.entry },
      });
      break;

    case "SUBSCRIPTION_ERROR":
      // Log but don't dispatch - non-fatal
      debugLog("[routeSubscriptionEvent] SUBSCRIPTION_ERROR:", event.containerId, event.error);
      break;
  }
}

/**
 * Creates a TypedEventSink that routes ContainerSubscriptionActivity events.
 *
 * @param dispatch - The dispatch function for DevToolsFlowRuntime
 * @returns A typed event sink compatible with ContainerSubscriptionActivity
 */
function createContainerSubscriptionSink(
  dispatch: (event: DevToolsFlowEvent) => void
): TypedEventSink<typeof ContainerSubscriptionEvents> {
  return {
    emit(...args) {
      const eventOrType = args[0];
      if (typeof eventOrType !== "string") {
        routeContainerSubscriptionEvent(eventOrType, dispatch);
      }
    },
  };
}

// =============================================================================
// DevToolsFlowRuntime Class
// =============================================================================

/**
 * Singleton coordinator owning three FlowService instances.
 *
 * Provides a unified API for React integration:
 * - `subscribe()` aggregates subscriptions from all three machines
 * - `getSnapshot()` returns a combined snapshot of all machine states
 * - `dispatch()` routes events to the appropriate machine based on prefix
 *
 * @remarks
 * The runtime uses a basic executor for effect execution. DIEffectExecutor
 * integration with the full container is available when activities are spawned
 * by the machines via the React integration layer.
 *
 * Cross-machine communication is handled by:
 * 1. The dispatch method checking for cross-machine events
 * 2. Forwarding events between machines when appropriate
 */
export class DevToolsFlowRuntime {
  private readonly uiRunner: UIRunner;
  private readonly tracingRunner: TracingRunner;
  private readonly containerTreeRunner: ContainerTreeRunner;

  private readonly uiActivityManager: ActivityManager;
  private readonly tracingActivityManager: ActivityManager;
  private readonly containerTreeActivityManager: ActivityManager;

  private readonly subscribers: Set<() => void>;
  private cachedSnapshot: DevToolsSnapshot | null;
  private disposed: boolean;

  private readonly rootInspector: InspectorAPI;
  private discoveryAbortController: AbortController | null;
  private subscriptionAbortController: AbortController | null;
  private lastContainerTreeState: ContainerTreeState;

  /**
   * Creates a new DevToolsFlowRuntime instance.
   *
   * @param config - The runtime configuration
   */
  constructor(config: DevToolsFlowRuntimeConfig) {
    this.rootInspector = config.inspector;
    this.subscribers = new Set();
    this.cachedSnapshot = null;
    this.disposed = false;
    this.discoveryAbortController = null;
    this.subscriptionAbortController = null;
    this.lastContainerTreeState = "idle";

    // Create activity managers for each machine
    this.uiActivityManager = createActivityManager({});
    this.tracingActivityManager = createActivityManager({});
    this.containerTreeActivityManager = createActivityManager({});

    // Create basic executors for each machine
    // DIEffectExecutor integration is done at the FlowAdapter level when needed
    const basicExecutor = createBasicExecutor();

    // Create machine runners
    this.uiRunner = createMachineRunner(devToolsUIMachine, {
      executor: basicExecutor,
      activityManager: this.uiActivityManager,
    });

    this.tracingRunner = createMachineRunner(tracingMachine, {
      executor: basicExecutor,
      activityManager: this.tracingActivityManager,
    });

    this.containerTreeRunner = createMachineRunner(containerTreeMachine, {
      executor: basicExecutor,
      activityManager: this.containerTreeActivityManager,
    });

    // Set up subscriptions to notify on any state change
    this.uiRunner.subscribe(() => this.notifySubscribers());
    this.tracingRunner.subscribe(() => this.notifySubscribers());
    this.containerTreeRunner.subscribe(() => this.notifySubscribers());

    // Set up container discovery activity spawning
    this.setupContainerDiscovery();
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Subscribes to state changes.
   *
   * Compatible with React 18's useSyncExternalStore.
   *
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Returns the current combined snapshot of all machine states.
   *
   * Compatible with React 18's useSyncExternalStore.
   *
   * @returns The current DevToolsSnapshot
   */
  getSnapshot(): DevToolsSnapshot {
    // Return cached snapshot if available
    if (this.cachedSnapshot !== null) {
      return this.cachedSnapshot;
    }

    // Create new snapshot
    const snapshot: DevToolsSnapshot = {
      ui: {
        state: this.uiRunner.state(),
        context: this.uiRunner.context(),
      },
      tracing: {
        state: this.tracingRunner.state(),
        context: this.tracingRunner.context(),
      },
      containerTree: {
        state: this.containerTreeRunner.state(),
        context: this.containerTreeRunner.context(),
      },
    };

    // Cache and return
    this.cachedSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Dispatches an event to the appropriate machine.
   *
   * Events are routed based on their type prefix:
   * - `UI.*` -> UI machine
   * - `TRACING.*` -> Tracing machine
   * - `CONTAINER_TREE.*` -> ContainerTree machine
   *
   * @param event - The event to dispatch
   */
  dispatch(event: DevToolsFlowEvent): void {
    if (this.disposed) {
      return;
    }

    // Only log for actual events, not the infinite loop spam
    if (
      event.type === "CONTAINER_TREE.DISCOVER" ||
      event.type === "CONTAINER_TREE.DISCOVERY_COMPLETE"
    ) {
      debugLog("[dispatch] IMPORTANT EVENT:", event.type);
    }

    const prefix = getEventPrefix(event.type);
    if (prefix === null) {
      // Unknown event prefix - ignore
      debugLog("[dispatch] Ignored - unknown prefix");
      return;
    }

    const localEventType = stripEventPrefix(event.type);
    debugLog("[dispatch] Routing to:", prefix, "localEvent:", localEventType);

    // Create local event with stripped prefix
    const localEvent = {
      ...event,
      type: localEventType,
    } as { readonly type: string; readonly payload?: unknown };

    // Route to appropriate machine
    switch (prefix) {
      case "UI":
        debugLog(
          "[dispatch:UI] BEFORE send - FSM state:",
          this.uiRunner.state(),
          "event:",
          localEventType,
          "payload:",
          "payload" in localEvent ? (localEvent as { payload?: unknown }).payload : "none"
        );
        this.uiRunner.send(localEvent as { readonly type: DevToolsUIEvent });
        debugLog(
          "[dispatch:UI] AFTER send - FSM state:",
          this.uiRunner.state(),
          "selectedIds:",
          Array.from(this.uiRunner.context().selectedIds)
        );
        break;

      case "TRACING":
        this.tracingRunner.send(localEvent as { readonly type: TracingEvent });
        break;

      case "CONTAINER_TREE":
        debugLog(
          "[dispatch:CONTAINER_TREE] localEventType:",
          localEventType,
          "payload:",
          "payload" in localEvent ? (localEvent as { payload?: unknown }).payload : "none"
        );
        this.containerTreeRunner.send(localEvent as { readonly type: ContainerTreeEvent });
        // Handle cross-machine forwarding for container events
        this.handleContainerTreeCrossMachineEvents(localEventType, event);
        break;
    }
  }

  /**
   * Whether the runtime has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Gets the root inspector for the container hierarchy.
   *
   * @returns The root InspectorAPI
   */
  getRootInspector(): InspectorAPI {
    return this.rootInspector;
  }

  /**
   * Finds an inspector by container ID by traversing the container tree.
   *
   * Searches the container hierarchy starting from the root inspector
   * to find the inspector for a specific container.
   *
   * @param containerId - The ID of the container to find
   * @returns The inspector for the container, or null if not found
   *
   * @example
   * ```typescript
   * const inspector = runtime.getInspector("ChatContainer");
   * if (inspector) {
   *   const scopeTree = inspector.getScopeTree();
   * }
   * ```
   */
  getInspector(containerId: string): InspectorAPI | null {
    debugLog("[getInspector] Looking for containerId:", containerId);
    const result = this.findInspectorById(this.rootInspector, containerId);
    debugLog("[getInspector] Result:", result ? "FOUND" : "NOT FOUND");
    return result;
  }

  /**
   * Gets the chain of inspectors from root to the target container.
   *
   * Used for building merged graphs that include inherited services.
   * The returned array contains all inspectors in the path from root
   * to the target container (inclusive).
   *
   * @param containerId - The ID of the target container
   * @returns Array of inspectors [root, ..., parent, target] or empty if not found
   *
   * @example
   * ```typescript
   * // For hierarchy: Root -> ChatDashboard -> SharedChild
   * const chain = runtime.getAncestorChain("SharedChild");
   * // Returns [RootInspector, ChatDashboardInspector, SharedChildInspector]
   *
   * // Build merged graph from chain
   * for (const inspector of chain) {
   *   const graphData = inspector.getGraphData();
   *   // Merge adapters...
   * }
   * ```
   */
  getAncestorChain(containerId: string): readonly InspectorAPI[] {
    debugLog("[getAncestorChain] Looking for containerId:", containerId);

    function walk(
      inspector: InspectorAPI,
      targetId: string,
      currentPath: InspectorAPI[]
    ): InspectorAPI[] | null {
      const snapshot = inspector.getSnapshot();
      const newPath = [...currentPath, inspector];

      debugLog("[getAncestorChain.walk] Checking:", snapshot.containerName, "vs", targetId);

      if (snapshot.containerName === targetId) {
        debugLog("[getAncestorChain.walk] FOUND! Path length:", newPath.length);
        return newPath;
      }

      const children = inspector.getChildContainers();
      debugLog(
        "[getAncestorChain.walk] Children count for",
        snapshot.containerName,
        ":",
        children.length
      );

      for (const child of children) {
        const found = walk(child, targetId, newPath);
        if (found !== null) {
          return found;
        }
      }
      return null;
    }

    const result = walk(this.rootInspector, containerId, []) ?? [];
    debugLog("[getAncestorChain] Result length:", result.length);
    return result;
  }

  /**
   * Disposes the runtime and all its resources.
   *
   * @returns Promise that resolves when disposal is complete
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.cachedSnapshot = null;

    // Abort any ongoing discovery
    if (this.discoveryAbortController !== null) {
      this.discoveryAbortController.abort();
      this.discoveryAbortController = null;
    }

    // Abort any ongoing subscription
    if (this.subscriptionAbortController !== null) {
      this.subscriptionAbortController.abort();
      this.subscriptionAbortController = null;
    }

    // Dispose all machine runners
    await Promise.all([
      this.uiRunner.dispose(),
      this.tracingRunner.dispose(),
      this.containerTreeRunner.dispose(),
    ]);

    // Dispose all activity managers
    await Promise.all([
      this.uiActivityManager.dispose(),
      this.tracingActivityManager.dispose(),
      this.containerTreeActivityManager.dispose(),
    ]);

    // Clear subscribers
    this.subscribers.clear();
  }

  // ===========================================================================
  // Internal Methods
  // ===========================================================================

  /**
   * Notifies all subscribers of a state change.
   */
  private notifySubscribers(): void {
    // Invalidate cached snapshot
    this.cachedSnapshot = null;

    // Notify all subscribers
    for (const callback of this.subscribers) {
      callback();
    }
  }

  /**
   * Handles cross-machine event forwarding for container tree events.
   *
   * Some ContainerTree events need to be forwarded to the UI machine
   * to keep container registration in sync.
   *
   * Uses discriminated union narrowing on originalEvent.type for type safety
   * when accessing payload data. Event sending uses sendUIEvent() helper
   * which isolates the necessary type cast at the machine boundary.
   */
  private handleContainerTreeCrossMachineEvents(
    _localEventType: string,
    originalEvent: DevToolsFlowEvent
  ): void {
    // Forward CONTAINER_ADDED to UI machine as CONTAINER_REGISTERED
    // Use discriminated union narrowing for type-safe payload access
    if (originalEvent.type === "CONTAINER_TREE.CONTAINER_ADDED") {
      // TypeScript narrows originalEvent to have payload.entry: ContainerTreeEntry
      const entry = originalEvent.payload.entry;
      // Use type-safe event builder
      const uiEvent = UIEventBuilders.containerRegistered({
        id: entry.id,
        label: entry.label,
        kind: entry.kind,
        parentId: entry.parentId,
      });
      sendUIEvent(this.uiRunner, uiEvent);
    }

    // Forward CONTAINER_REMOVED to UI machine as CONTAINER_UNREGISTERED
    if (originalEvent.type === "CONTAINER_TREE.CONTAINER_REMOVED") {
      // TypeScript narrows originalEvent to have payload.id: string
      const uiEvent = UIEventBuilders.containerUnregistered(originalEvent.payload.id);
      sendUIEvent(this.uiRunner, uiEvent);
    }
  }

  /**
   * Recursively finds an inspector by container ID.
   */
  private findInspectorById(inspector: InspectorAPI, targetId: string): InspectorAPI | null {
    const snapshot = inspector.getSnapshot();
    debugLog("[findInspectorById] Checking:", snapshot.containerName, "vs", targetId);

    if (snapshot.containerName === targetId) {
      debugLog("[findInspectorById] FOUND!");
      return inspector;
    }

    // Avoid infinite recursion by limiting depth
    const children = inspector.getChildContainers();
    debugLog(
      "[findInspectorById] Children count for",
      snapshot.containerName,
      ":",
      children.length
    );

    for (const child of children) {
      const found = this.findInspectorById(child, targetId);
      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  /**
   * Sets up container discovery and subscription activity spawning.
   *
   * Listens to ContainerTree machine state changes and:
   * - Spawns ContainerDiscoveryActivity when transitioning to "discovering"
   * - Spawns ContainerSubscriptionActivity when transitioning to "ready"
   */
  private setupContainerDiscovery(): void {
    this.containerTreeRunner.subscribe(() => {
      const currentState = this.containerTreeRunner.state();
      const previousState = this.lastContainerTreeState;

      // Update state BEFORE spawning to prevent synchronous re-entrancy
      // Without this, the nested subscriber call from activity events
      // would see lastContainerTreeState as the old value and re-trigger discovery
      this.lastContainerTreeState = currentState;

      // Check for transition into "discovering" state
      if (previousState !== "discovering" && currentState === "discovering") {
        this.spawnContainerDiscovery();
      }

      // Check for transition from "discovering" to "ready" state
      // This means discovery completed - spawn subscription for live updates
      if (previousState === "discovering" && currentState === "ready") {
        this.spawnContainerSubscription();
      }
    });
  }

  /**
   * Spawns the ContainerDiscoveryActivity.
   *
   * Creates an event sink that routes activity events to the machine
   * with proper prefixing. The activity recursively discovers all
   * containers via getChildContainers() and emits CONTAINER_ADDED events.
   */
  private spawnContainerDiscovery(): void {
    debugLog("[spawnContainerDiscovery] SPAWNING DISCOVERY");

    // Abort any previous discovery
    if (this.discoveryAbortController !== null) {
      debugLog("[spawnContainerDiscovery] Aborting previous discovery");
      this.discoveryAbortController.abort();
    }

    this.discoveryAbortController = new AbortController();

    // Create type-safe event sink using factory
    // The factory uses discriminated union narrowing for full type safety
    const eventSink = createContainerDiscoverySink(this.dispatch.bind(this));

    // Execute the activity with properly typed sink
    ContainerDiscoveryActivity.execute(
      { inspector: this.rootInspector },
      {
        sink: eventSink,
        signal: this.discoveryAbortController.signal,
        deps: {},
      }
    ).catch((error: unknown) => {
      // Ignore errors if runtime is already disposed
      if (this.disposed) {
        return;
      }
      // Handle unexpected errors
      const err = error instanceof Error ? error : new Error(String(error));
      this.dispatch({
        type: "CONTAINER_TREE.DISCOVERY_ERROR",
        payload: { error: err },
      });
    });
  }

  /**
   * Spawns the ContainerSubscriptionActivity for live updates.
   *
   * Called when transitioning from "discovering" to "ready" state.
   * Subscribes to all discovered container inspectors and routes
   * their events to the FSM for state updates.
   */
  private spawnContainerSubscription(): void {
    debugLog("[spawnContainerSubscription] Starting subscription activity");

    // Abort any previous subscription
    if (this.subscriptionAbortController !== null) {
      this.subscriptionAbortController.abort();
    }
    this.subscriptionAbortController = new AbortController();

    // Get all discovered containers and build inspector refs
    const containers = this.containerTreeRunner.context().containers;
    const inspectorRefs: InspectorRef[] = [];

    for (const container of containers) {
      const inspector = this.findInspectorById(this.rootInspector, container.id);
      if (inspector !== null) {
        inspectorRefs.push({ inspector, containerId: container.id });
      }
    }

    debugLog(`[spawnContainerSubscription] Subscribing to ${inspectorRefs.length} containers`);

    // Create event sink and spawn activity
    const eventSink = createContainerSubscriptionSink(this.dispatch.bind(this));

    // Execute the long-running subscription activity
    ContainerSubscriptionActivity.execute(
      { inspectorRefs },
      {
        sink: eventSink,
        signal: this.subscriptionAbortController.signal,
        deps: {},
      }
    )
      .then(output => {
        debugLog(
          `[spawnContainerSubscription] Activity completed with ${output.activeSubscriptionCount} subscriptions`
        );
      })
      .catch((error: unknown) => {
        // Only log if not aborted (expected during dispose) and not disposed
        if (!this.subscriptionAbortController?.signal.aborted && !this.disposed) {
          debugLog("[spawnContainerSubscription] ERROR:", error);
        }
      });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a new DevToolsFlowRuntime instance.
 *
 * @param config - The runtime configuration
 * @returns A new DevToolsFlowRuntime instance
 *
 * @example
 * ```typescript
 * import { createContainer } from "@hex-di/runtime";
 *
 * // Create container - inspector is built-in
 * const container = createContainer(graph, { name: "App" });
 *
 * // Access inspector via built-in property
 * const inspector = container.inspector;
 * const runtime = createDevToolsFlowRuntime({ inspector });
 *
 * // Dispatch DISCOVER to start container discovery
 * runtime.dispatch({ type: "CONTAINER_TREE.DISCOVER" });
 *
 * // Use with React
 * const snapshot = useSyncExternalStore(
 *   runtime.subscribe,
 *   runtime.getSnapshot
 * );
 * ```
 */
export function createDevToolsFlowRuntime(config: DevToolsFlowRuntimeConfig): DevToolsFlowRuntime {
  return new DevToolsFlowRuntime(config);
}
