/**
 * Container tree instrumentation for distributed tracing.
 *
 * Provides automatic instrumentation of entire container hierarchies,
 * including dynamic child containers created after initial setup.
 *
 * @packageDocumentation
 */

import type { InspectorAPI, InspectorListener } from "@hex-di/core";
import type { Tracer } from "../ports/tracer.js";
import { instrumentContainer } from "./container.js";
import type { AutoInstrumentOptions, HookableContainer } from "./types.js";
import {
  registerContainerMapping,
  getContainerFromInspector,
  isHookableContainer,
} from "./utils.js";
import { childInspectorMap } from "@hex-di/runtime/internal";

/**
 * Instruments an entire container tree with distributed tracing.
 *
 * This function:
 * 1. Instruments the root container
 * 2. Walks the existing container hierarchy and instruments all children
 * 3. Subscribes to inspector events to auto-instrument new child containers
 * 4. Returns a cleanup function that removes all hooks and subscriptions
 *
 * Cross-container span relationships are established automatically via the
 * module-level span stack. When a root container resolution triggers a child
 * container resolution, the parent span is already on the stack, so the child
 * span becomes its child.
 *
 * @param container - The root container to instrument
 * @param inspector - The inspector API for the root container
 * @param tracer - The tracer to use for creating spans
 * @param options - Optional configuration for filtering and attributes
 * @returns Cleanup function to remove all hooks and subscriptions (idempotent)
 *
 * @remarks
 * **Tree-wide instrumentation:**
 * All containers in the hierarchy share the same tracer and options.
 * This ensures consistent tracing across container boundaries.
 *
 * **Live subscription:**
 * The function subscribes to 'child-created' events on all inspectors.
 * New child containers are automatically instrumented when they're created.
 *
 * **Cleanup:**
 * The returned cleanup function is idempotent - safe to call multiple times.
 * It removes hooks from all instrumented containers and unsubscribes from
 * all inspector events.
 *
 * **Parent-child span relationships (INST-09):**
 * Cross-container spans maintain proper parent-child relationships because:
 * - The span stack is module-level (shared across all containers)
 * - When a resolution in Container A triggers a resolution in Container B,
 *   Container A's span is already on the stack
 * - Container B's span is created with Container A's span as parent
 *
 * **Double-instrumentation:**
 * If a container is already instrumented, the old hooks are automatically
 * cleaned up before installing new ones. This is handled by instrumentContainer.
 *
 * @example Basic tree instrumentation
 * ```typescript
 * const cleanup = instrumentContainerTree(
 *   container,
 *   container.inspector,
 *   tracer
 * );
 *
 * // All resolutions in the container tree now create spans
 * const logger = container.resolve(LoggerPort);
 *
 * // Child containers created later are auto-instrumented
 * const childContainer = container.createChild(childGraph);
 * const cache = childContainer.resolve(CachePort); // Creates span
 *
 * // Later, remove all instrumentation
 * cleanup();
 * ```
 *
 * @example Production-optimized tree instrumentation
 * ```typescript
 * instrumentContainerTree(
 *   container,
 *   container.inspector,
 *   tracer,
 *   {
 *     traceCachedResolutions: false,
 *     minDurationMs: 5,
 *     portFilter: {
 *       include: ['ApiService', 'DatabasePool'],
 *     },
 *     additionalAttributes: {
 *       'service.name': 'user-api',
 *       'deployment.environment': 'production',
 *     },
 *   }
 * );
 * ```
 */
export function instrumentContainerTree(
  container: HookableContainer,
  inspector: InspectorAPI,
  tracer: Tracer,
  options?: AutoInstrumentOptions
): () => void {
  /**
   * Map tracking cleanup functions for all instrumented containers.
   *
   * Key: Container instance
   * Value: Cleanup function to remove hooks from that container
   */
  const cleanups = new Map<HookableContainer, () => void>();

  /**
   * Array tracking unsubscribe functions for all inspector subscriptions.
   *
   * Each entry is a function that removes an inspector event listener.
   */
  const unsubscribes: Array<() => void> = [];

  /**
   * Instruments a single container if not already instrumented.
   *
   * Checks the cleanups Map to avoid double-instrumentation. If the
   * container is new, installs hooks and stores the cleanup function.
   *
   * @param containerToInstrument - The container to instrument
   */
  function instrumentOne(containerToInstrument: HookableContainer): void {
    // Skip if already instrumented
    if (cleanups.has(containerToInstrument)) {
      return;
    }

    // Instrument and store cleanup
    const cleanup = instrumentContainer(containerToInstrument, tracer, options);
    cleanups.set(containerToInstrument, cleanup);
  }

  /**
   * Recursively walks the container tree and instruments all containers.
   *
   * Instruments the given container, then walks all child containers via
   * InspectorAPI.getChildContainers() and recursively instruments them.
   *
   * Also subscribes to inspector events for the given inspector to handle
   * child containers created in the future.
   *
   * @param containerToWalk - The container to walk from
   * @param inspectorToWalk - The inspector for the container
   */
  function walkTree(containerToWalk: HookableContainer, inspectorToWalk: InspectorAPI): void {
    // Instrument this container
    instrumentOne(containerToWalk);

    // Register mapping for reverse lookup (child containers need this)
    registerContainerMapping(inspectorToWalk, containerToWalk);

    // Subscribe to inspector events for live updates
    const listener: InspectorListener = event => {
      if (event.type === "child-created") {
        // Get child inspector directly from childInspectorMap using childId
        const childIdNumeric = Number(event.childId);
        const childInspector = childInspectorMap.get(childIdNumeric);

        if (childInspector) {
          // Use getContainer() for direct access to the child container
          const directContainer = childInspector.getContainer?.();
          const childContainer = isHookableContainer(directContainer)
            ? directContainer
            : getContainerFromInspector(childInspector);

          if (childContainer && !cleanups.has(childContainer)) {
            // Register mapping for this child's potential children
            registerContainerMapping(childInspector, childContainer);
            // Recursively instrument the new child
            walkTree(childContainer, childInspector);
          }
        }
      }
    };

    const unsubscribe = inspectorToWalk.subscribe(listener);
    unsubscribes.push(unsubscribe);

    // Walk existing child containers
    const childInspectors = inspectorToWalk.getChildContainers();
    for (const childInspector of childInspectors) {
      // Skip lazy containers - they'll be instrumented when they emit child-created event
      if (childInspector.getContainerKind() === "lazy") {
        continue;
      }

      // Use getContainer() for direct access (works for both pre-existing and dynamic children)
      const directContainer = childInspector.getContainer?.();
      const childContainer = isHookableContainer(directContainer)
        ? directContainer
        : getContainerFromInspector(childInspector);

      if (childContainer) {
        // Recursively walk the child tree
        walkTree(childContainer, childInspector);
      }
    }
  }

  // Start walking from the root
  walkTree(container, inspector);

  // Create cleanup function that removes all hooks and subscriptions
  let cleanupCalled = false;
  return () => {
    if (cleanupCalled) {
      return;
    }
    cleanupCalled = true;

    // Unsubscribe from all inspector events
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
    unsubscribes.length = 0;

    // Remove hooks from all instrumented containers
    for (const cleanup of cleanups.values()) {
      cleanup();
    }
    cleanups.clear();
  };
}
