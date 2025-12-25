/**
 * Hooks for accessing InspectorAPI from context.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { InspectorAPI } from "@hex-di/inspector";
import { ContainerRegistryContext } from "../context/container-registry.js";

/**
 * Access the currently selected container's InspectorAPI.
 *
 * Returns null if:
 * - ContainerRegistryProvider is not present
 * - No container is selected
 * - Selected container doesn't have InspectorPlugin
 *
 * @example Basic usage
 * ```typescript
 * import { useInspector } from "@hex-di/devtools/react";
 *
 * function InspectorPanel() {
 *   const inspector = useInspector();
 *
 *   if (inspector === null) {
 *     return <div>No container selected</div>;
 *   }
 *
 *   const snapshot = inspector.getSnapshot();
 *   return <pre>{JSON.stringify(snapshot, null, 2)}</pre>;
 * }
 * ```
 *
 * @example With type narrowing
 * ```typescript
 * function SnapshotDisplay() {
 *   const inspector = useInspector();
 *   if (!inspector) return null;
 *
 *   const snapshot = inspector.getSnapshot();
 *
 *   if (snapshot.kind === "root") {
 *     return (
 *       <div>
 *         Root container: {snapshot.asyncAdaptersInitialized}/{snapshot.asyncAdaptersTotal} adapters
 *       </div>
 *     );
 *   }
 *
 *   if (snapshot.kind === "lazy") {
 *     return <div>Lazy container: {snapshot.isLoaded ? "loaded" : "not loaded"}</div>;
 *   }
 *
 *   return <div>Container kind: {snapshot.kind}</div>;
 * }
 * ```
 */
export function useInspector(): InspectorAPI | null {
  const registry = useContext(ContainerRegistryContext);
  return registry?.selectedInspector ?? null;
}

/**
 * Access InspectorAPI with non-null assertion.
 *
 * Throws if:
 * - ContainerRegistryProvider is not present
 * - No container is selected
 *
 * Use this when you know a container is always selected, such as
 * in components that are only rendered when inspection is active.
 *
 * @example Usage in a panel that requires inspector
 * ```typescript
 * import { useInspectorStrict } from "@hex-di/devtools/react";
 *
 * function ServiceList() {
 *   const inspector = useInspectorStrict();
 *   const ports = inspector.listPorts();
 *
 *   return (
 *     <ul>
 *       {ports.map((portName) => (
 *         <li key={portName}>
 *           {portName}: {inspector.isResolved(portName) ? "resolved" : "pending"}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @throws {Error} If ContainerRegistryProvider is not present or no container is selected
 */
export function useInspectorStrict(): InspectorAPI {
  const inspector = useInspector();

  if (inspector === null) {
    throw new Error(
      "useInspectorStrict requires ContainerRegistryProvider with at least one container registered"
    );
  }

  return inspector;
}
