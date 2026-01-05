/**
 * Container Subscription Activity
 *
 * Long-running activity that subscribes to container inspector events
 * and emits live updates when container data changes. This enables
 * real-time updates in the DevTools UI without polling.
 *
 * Spawned after discovery completes to keep container data in FSM
 * synchronized with actual container state.
 *
 * @packageDocumentation
 */

import { defineEvents, activity, activityPort } from "@hex-di/flow";
import type { InspectorWithSubscription, ContainerGraphData } from "@hex-di/runtime";
import type { ScopeTree, ContainerPhase, ContainerKind } from "@hex-di/plugin";
import type { ContainerTreeEntry } from "../machines/container-tree.machine.js";

// =============================================================================
// Activity Events
// =============================================================================

/**
 * Events emitted by the container subscription activity.
 */
export const ContainerSubscriptionEvents = defineEvents({
  /** Container data changed (scope tree, resolution, etc.) */
  CONTAINER_UPDATED: (entry: ContainerTreeEntry) => ({ entry }),

  /** Container was disposed */
  CONTAINER_DISPOSED: (containerId: string) => ({ containerId }),

  /** New child container created dynamically */
  CHILD_CONTAINER_CREATED: (entry: ContainerTreeEntry) => ({ entry }),

  /** Subscription error (non-fatal, logged for debugging) */
  SUBSCRIPTION_ERROR: (containerId: string, error: Error) => ({ containerId, error }),
});

// =============================================================================
// Activity Types
// =============================================================================

/**
 * Inspector reference with container ID for tracking.
 */
export interface InspectorRef {
  readonly inspector: InspectorWithSubscription;
  readonly containerId: string;
}

/**
 * Input for the container subscription activity.
 */
export interface ContainerSubscriptionInput {
  /** Array of inspector references to subscribe to */
  readonly inspectorRefs: readonly InspectorRef[];
}

/**
 * Output from the container subscription activity.
 */
export interface ContainerSubscriptionOutput {
  /** Number of subscriptions that were active when activity ended */
  readonly activeSubscriptionCount: number;
}

// =============================================================================
// Activity Port
// =============================================================================

/**
 * Port for the container subscription activity.
 */
export const ContainerSubscriptionPort = activityPort<
  ContainerSubscriptionInput,
  ContainerSubscriptionOutput
>()("ContainerSubscription");

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a complete ContainerTreeEntry from an inspector.
 * Same logic as ContainerDiscoveryActivity.createContainerEntry.
 */
function createCompleteContainerEntry(
  inspector: InspectorWithSubscription,
  parentId: string | null
): ContainerTreeEntry {
  const snapshot = inspector.getSnapshot();
  const scopeTree = inspector.getScopeTree();
  const graphData = inspector.getGraphData();
  const phase = inspector.getPhase();

  // Get child IDs
  const childIds = inspector.getChildContainers().map(child => child.getSnapshot().containerName);

  // Map snapshot.kind to ContainerKind (scope -> root for display purposes)
  const kind: ContainerKind = snapshot.kind === "scope" ? "root" : snapshot.kind;

  return {
    id: snapshot.containerName,
    label: snapshot.containerName,
    kind,
    parentId,
    childIds,
    scopeTree,
    graphData,
    resolvedCount: scopeTree.resolvedCount,
    totalCount: scopeTree.totalCount,
    resolvedPorts: scopeTree.resolvedPorts,
    phase,
    isDisposed: snapshot.isDisposed,
  };
}

/**
 * Finds the parent ID for a container by checking all inspectors.
 * This is needed when creating entries for dynamically discovered children.
 */
function findParentId(
  childInspector: InspectorWithSubscription,
  allRefs: readonly InspectorRef[]
): string | null {
  const childName = childInspector.getSnapshot().containerName;

  for (const ref of allRefs) {
    const children = ref.inspector.getChildContainers();
    for (const child of children) {
      if (child.getSnapshot().containerName === childName) {
        return ref.containerId;
      }
    }
  }

  return null;
}

// =============================================================================
// Activity Implementation
// =============================================================================

/**
 * Container Subscription Activity.
 *
 * Long-running activity that subscribes to all discovered container inspectors
 * and emits events when container data changes. Runs until abort signal.
 *
 * Events emitted:
 * - CONTAINER_UPDATED: When a container's scope tree or resolution state changes
 * - CONTAINER_DISPOSED: When a container is disposed
 * - CHILD_CONTAINER_CREATED: When a new child container is dynamically created
 *
 * @example
 * ```typescript
 * // Spawn after discovery completes
 * const { output } = await runActivity(ContainerSubscriptionActivity, {
 *   input: { inspectorRefs: discoveredRefs },
 *   signal: controller.signal,
 * });
 * ```
 */
export const ContainerSubscriptionActivity = activity(ContainerSubscriptionPort, {
  requires: [] as const,
  emits: ContainerSubscriptionEvents,
  timeout: Infinity, // Long-running activity - runs until abort

  async execute(
    input: ContainerSubscriptionInput,
    { sink, signal }
  ): Promise<ContainerSubscriptionOutput> {
    const { inspectorRefs } = input;
    const unsubscribes: Array<() => void> = [];
    const subscribedIds = new Set<string>();

    // Track refs for parent lookup
    const allRefs = [...inspectorRefs];

    // Subscribe to each inspector
    for (const { inspector, containerId } of inspectorRefs) {
      if (signal.aborted) break;

      try {
        const unsub = inspector.subscribe(event => {
          if (signal.aborted) return;

          // Handle relevant events
          switch (event.type) {
            case "resolution":
            case "scope-created":
            case "scope-disposed":
            case "snapshot-changed": {
              // Refresh container data and emit update
              try {
                const parentRef = allRefs.find(r =>
                  r.inspector
                    .getChildContainers()
                    .some(c => c.getSnapshot().containerName === containerId)
                );
                const parentId = parentRef?.containerId ?? null;
                const updatedEntry = createCompleteContainerEntry(inspector, parentId);
                sink.emit(ContainerSubscriptionEvents.CONTAINER_UPDATED(updatedEntry));
              } catch (err) {
                sink.emit(
                  ContainerSubscriptionEvents.SUBSCRIPTION_ERROR(
                    containerId,
                    err instanceof Error ? err : new Error(String(err))
                  )
                );
              }
              break;
            }

            case "phase-changed": {
              if (event.phase === "disposed") {
                sink.emit(ContainerSubscriptionEvents.CONTAINER_DISPOSED(containerId));
              }
              break;
            }

            case "child-created": {
              // Discover the new child and emit
              try {
                const childInspectors = inspector.getChildContainers();
                const newChild = childInspectors.find(
                  c => c.getSnapshot().containerName === event.childId
                );
                if (newChild) {
                  // Add to allRefs for future parent lookups
                  const newRef: InspectorRef = {
                    inspector: newChild,
                    containerId: event.childId,
                  };
                  allRefs.push(newRef);

                  // Subscribe to new child
                  // Note: We don't recursively call this - just track the new child
                  const childEntry = createCompleteContainerEntry(newChild, containerId);
                  sink.emit(ContainerSubscriptionEvents.CHILD_CONTAINER_CREATED(childEntry));
                }
              } catch (err) {
                sink.emit(
                  ContainerSubscriptionEvents.SUBSCRIPTION_ERROR(
                    containerId,
                    err instanceof Error ? err : new Error(String(err))
                  )
                );
              }
              break;
            }

            case "child-disposed": {
              // Child disposal is handled by the child's own subscription
              // Just emit for logging purposes
              sink.emit(ContainerSubscriptionEvents.CONTAINER_DISPOSED(event.childId));
              break;
            }
          }
        });

        unsubscribes.push(unsub);
        subscribedIds.add(containerId);
      } catch (err) {
        // Log but continue with other subscriptions
        sink.emit(
          ContainerSubscriptionEvents.SUBSCRIPTION_ERROR(
            containerId,
            err instanceof Error ? err : new Error(String(err))
          )
        );
      }
    }

    // Wait for abort signal
    await new Promise<void>(resolve => {
      if (signal.aborted) {
        resolve();
        return;
      }
      signal.addEventListener("abort", () => resolve(), { once: true });
    });

    // Cleanup subscriptions
    for (const unsub of unsubscribes) {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    }

    return { activeSubscriptionCount: subscribedIds.size };
  },
});
