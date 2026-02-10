/**
 * Flow Library Inspector Bridge
 *
 * Creates a LibraryInspector that bridges FlowInspector and FlowRegistry
 * into the container's unified inspection protocol.
 *
 * @packageDocumentation
 */

import type { LibraryInspector, LibraryEventListener } from "@hex-di/core";
import type { FlowInspector, FlowRegistry, RegistryEvent } from "../introspection/types.js";

/**
 * Creates a LibraryInspector that bridges FlowInspector and FlowRegistry
 * into the container's unified Library Inspector Protocol.
 *
 * The returned inspector:
 * - Reports `name: "flow"`
 * - Exposes machine count, machine data, health events, and effect statistics via `getSnapshot()`
 * - Forwards registry events (machine-registered / machine-unregistered) to subscribers
 * - Delegates `dispose()` to the underlying FlowInspector
 *
 * @param flowInspector - The FlowInspector instance for health/effect data
 * @param registry - The FlowRegistry instance for live machine tracking
 * @returns A frozen LibraryInspector
 *
 * @example
 * ```typescript
 * const inspector = createFlowLibraryInspector(flowInspector, registry);
 * container.inspector.registerLibrary(inspector);
 *
 * const snapshot = inspector.getSnapshot();
 * // { machineCount: 2, machines: [...], healthEvents: [...], effectStatistics: {...} }
 * ```
 */
export function createFlowLibraryInspector(
  flowInspector: FlowInspector,
  registry: FlowRegistry
): LibraryInspector {
  return {
    name: "flow",
    getSnapshot() {
      const machines = registry.getAllMachines();
      return Object.freeze({
        machineCount: machines.length,
        machines: Object.freeze(
          machines.map(m =>
            Object.freeze({
              portName: m.portName,
              instanceId: m.instanceId,
              machineId: m.machineId,
              state: m.state(),
              scopeId: m.scopeId,
            })
          )
        ),
        healthEvents: Object.freeze(flowInspector.getHealthEvents()),
        effectStatistics: Object.freeze(
          Object.fromEntries(flowInspector.getEffectResultStatistics())
        ),
      });
    },
    subscribe(listener: LibraryEventListener): () => void {
      return registry.subscribe((event: RegistryEvent) => {
        listener({
          source: "flow",
          type: event.type,
          payload: Object.freeze(
            event.type === "machine-registered"
              ? {
                  portName: event.entry.portName,
                  instanceId: event.entry.instanceId,
                  machineId: event.entry.machineId,
                }
              : { portName: event.portName, instanceId: event.instanceId }
          ),
          timestamp: Date.now(),
        });
      });
    },
    dispose() {
      flowInspector.dispose();
    },
  };
}
