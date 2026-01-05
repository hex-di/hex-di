/**
 * Container Discovery Activity
 *
 * Long-running activity that discovers containers via InspectorPlugin
 * and emits CONTAINER_ADDED events for each discovered container.
 * Uses AbortSignal for proper cleanup and cancellation.
 *
 * This activity is designed to be spawned by the ContainerTreeMachine
 * when transitioning to the "discovering" state.
 *
 * @packageDocumentation
 */

import { defineEvents, activity, activityPort } from "@hex-di/flow";
import type { InspectorWithSubscription } from "@hex-di/runtime";
import type { ContainerTreeEntry } from "../machines/container-tree.machine.js";

// Debug logging helper
const debugLog = (...args: unknown[]): void => {
  if (typeof globalThis !== "undefined" && "console" in globalThis) {
    (globalThis as unknown as { console: { log: (...a: unknown[]) => void } }).console.log(...args);
  }
};

// =============================================================================
// Activity Events
// =============================================================================

/**
 * Events emitted by the container discovery activity.
 */
export const ContainerDiscoveryEvents = defineEvents({
  /** Container discovered */
  CONTAINER_ADDED: (entry: ContainerTreeEntry) => ({ entry }),

  /** Discovery completed successfully */
  DISCOVERY_COMPLETE: () => ({}),

  /** Discovery failed with error */
  DISCOVERY_ERROR: (error: Error) => ({ error }),
});

// =============================================================================
// Activity Types
// =============================================================================

/**
 * Input for the container discovery activity.
 */
export interface ContainerDiscoveryInput {
  /** The root inspector to start discovery from */
  readonly inspector: InspectorWithSubscription;
}

/**
 * Output from the container discovery activity.
 */
export interface ContainerDiscoveryOutput {
  /** Number of containers discovered */
  readonly discoveredCount: number;
}

// =============================================================================
// Activity Port
// =============================================================================

/**
 * Port for the container discovery activity.
 */
export const ContainerDiscoveryPort = activityPort<
  ContainerDiscoveryInput,
  ContainerDiscoveryOutput
>()("ContainerDiscovery");

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extracts container ID from inspector snapshot.
 * Uses containerName as a fallback since containerId may not be exposed.
 */
function getContainerId(inspector: InspectorWithSubscription): string {
  const snapshot = inspector.getSnapshot();
  // Try to get a unique identifier - containerName should be unique per container
  return snapshot.containerName;
}

/**
 * Creates a ContainerTreeEntry from an inspector with COMPLETE data.
 *
 * Fetches all data needed for the UI during discovery so that React
 * components don't need direct inspector access.
 */
function createContainerEntry(
  inspector: InspectorWithSubscription,
  parentId: string | null
): ContainerTreeEntry {
  const snapshot = inspector.getSnapshot();
  const scopeTree = inspector.getScopeTree();
  const graphData = inspector.getGraphData();
  const phase = inspector.getPhase();
  const id = getContainerId(inspector);

  // Get child IDs
  const childIds = inspector.getChildContainers().map(child => getContainerId(child));

  // Map snapshot.kind to ContainerKind (scope -> root for display purposes)
  const kind = snapshot.kind === "scope" ? ("root" as const) : snapshot.kind;

  return {
    // Identity & Hierarchy
    id,
    label: snapshot.containerName,
    kind,
    parentId,
    childIds,

    // Complete Data (fetched from inspector)
    scopeTree,
    graphData,

    // Computed Stats (from scopeTree)
    resolvedCount: scopeTree.resolvedCount,
    totalCount: scopeTree.totalCount,
    resolvedPorts: scopeTree.resolvedPorts,

    // Lifecycle State
    phase,
    isDisposed: snapshot.isDisposed,
  };
}

/**
 * Recursively discovers containers starting from the given inspector.
 * Uses a visited set to prevent infinite loops from circular references.
 */
function discoverContainers(
  inspector: InspectorWithSubscription,
  parentId: string | null,
  discovered: ContainerTreeEntry[],
  signal: AbortSignal,
  visited: Set<string> = new Set()
): void {
  if (signal.aborted) {
    return;
  }

  // Get container ID first to check for cycles
  const id = getContainerId(inspector);

  // Cycle detection - prevent infinite recursion
  if (visited.has(id)) {
    debugLog("[discoverContainers] CYCLE DETECTED - skipping:", id);
    return;
  }
  visited.add(id);

  // Create entry for this container
  const entry = createContainerEntry(inspector, parentId);
  discovered.push(entry);

  // Recursively discover children
  const children = inspector.getChildContainers();
  debugLog("[discoverContainers]", id, "has", children.length, "children");

  for (const child of children) {
    if (signal.aborted) {
      return;
    }
    discoverContainers(child, entry.id, discovered, signal, visited);
  }
}

// =============================================================================
// Activity Implementation
// =============================================================================

/**
 * Container Discovery Activity.
 *
 * Discovers all containers starting from the root inspector and emits
 * CONTAINER_ADDED events for each discovered container. Traverses the
 * container hierarchy recursively using getChildContainers().
 *
 * @example
 * ```typescript
 * const { events } = await testActivity(ContainerDiscoveryActivity, {
 *   input: { inspector: rootInspector },
 *   deps: {},
 * });
 *
 * const containerEvents = events.filter(e => e.type === 'CONTAINER_ADDED');
 * console.log(`Discovered ${containerEvents.length} containers`);
 * ```
 */
export const ContainerDiscoveryActivity = activity(ContainerDiscoveryPort, {
  requires: [] as const,
  emits: ContainerDiscoveryEvents,
  timeout: 30_000, // 30 second timeout for discovery

  async execute(
    input: ContainerDiscoveryInput,
    { sink, signal }
  ): Promise<ContainerDiscoveryOutput> {
    const { inspector } = input;
    debugLog("[Activity] START - discovering containers");

    if (signal.aborted) {
      sink.emit(
        ContainerDiscoveryEvents.DISCOVERY_ERROR(new Error("Discovery aborted before start"))
      );
      return { discoveredCount: 0 };
    }

    try {
      const discovered: ContainerTreeEntry[] = [];
      discoverContainers(inspector, null, discovered, signal);

      debugLog(
        "[Activity] Found",
        discovered.length,
        "containers:",
        discovered.map(c => `${c.id}(${c.kind})`).join(", ")
      );

      if (signal.aborted) {
        sink.emit(ContainerDiscoveryEvents.DISCOVERY_ERROR(new Error("Discovery aborted")));
        return { discoveredCount: discovered.length };
      }

      for (const entry of discovered) {
        if (signal.aborted) {
          break;
        }
        sink.emit(ContainerDiscoveryEvents.CONTAINER_ADDED(entry));
      }

      if (!signal.aborted) {
        debugLog("[Activity] COMPLETE - emitting DISCOVERY_COMPLETE");
        sink.emit(ContainerDiscoveryEvents.DISCOVERY_COMPLETE());
      }

      return { discoveredCount: discovered.length };
    } catch (error) {
      debugLog("[Activity] ERROR:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      sink.emit(ContainerDiscoveryEvents.DISCOVERY_ERROR(err));
      return { discoveredCount: 0 };
    }
  },
});
