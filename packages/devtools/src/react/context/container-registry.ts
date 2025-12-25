/**
 * Container Registry Context for multi-container DevTools support.
 *
 * Tracks all containers in the application (root, child, lazy, scope)
 * and provides selection state for the DevTools inspector.
 *
 * @packageDocumentation
 */

import { createContext } from "react";
import type { InspectorAPI, ContainerKind } from "@hex-di/inspector";

// =============================================================================
// Container Entry Types
// =============================================================================

/**
 * Entry for a tracked container in DevTools.
 */
export interface ContainerEntry {
  /** Unique identifier for this container */
  readonly id: string;

  /** Human-readable label for display */
  readonly label: string;

  /** Container type (root, child, lazy, scope) */
  readonly kind: ContainerKind;

  /** InspectorAPI for this container */
  readonly inspector: InspectorAPI;

  /** Parent container ID, if any */
  readonly parentId: string | null;

  /** Timestamp when the container was registered */
  readonly createdAt: number;
}

// =============================================================================
// Container Registry Context Value
// =============================================================================

/**
 * Context value for multi-container DevTools.
 */
export interface ContainerRegistryValue {
  /** All registered containers */
  readonly containers: ReadonlyMap<string, ContainerEntry>;

  /** Currently selected container ID */
  readonly selectedId: string | null;

  /** Select a container for inspection */
  readonly selectContainer: (id: string | null) => void;

  /** Get the currently selected container's inspector */
  readonly selectedInspector: InspectorAPI | null;

  /** Get the currently selected container entry */
  readonly selectedEntry: ContainerEntry | null;

  /** Register a new container */
  readonly registerContainer: (entry: ContainerEntry) => void;

  /** Unregister a container (on dispose) */
  readonly unregisterContainer: (id: string) => void;
}

// =============================================================================
// Container Registry Context
// =============================================================================

/**
 * React Context for multi-container DevTools.
 *
 * Use ContainerRegistryProvider at the root of your app to enable
 * tracking of all containers. Components can then use hooks like
 * useContainerList and useInspector to access container data.
 *
 * @example
 * ```typescript
 * import {
 *   ContainerRegistryProvider,
 *   useContainerList,
 *   useInspector
 * } from "@hex-di/devtools";
 *
 * function App() {
 *   return (
 *     <ContainerRegistryProvider>
 *       <MainApp />
 *       <DevToolsPanel />
 *     </ContainerRegistryProvider>
 *   );
 * }
 *
 * function DevToolsPanel() {
 *   const { containers, selectedId, selectContainer } = useContainerList();
 *   const inspector = useInspector();
 *
 *   return (
 *     <div>
 *       <select
 *         value={selectedId ?? ""}
 *         onChange={(e) => selectContainer(e.target.value || null)}
 *       >
 *         {Array.from(containers.values()).map((entry) => (
 *           <option key={entry.id} value={entry.id}>
 *             {entry.label} ({entry.kind})
 *           </option>
 *         ))}
 *       </select>
 *
 *       {inspector && (
 *         <pre>{JSON.stringify(inspector.getSnapshot(), null, 2)}</pre>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export const ContainerRegistryContext = createContext<ContainerRegistryValue | null>(null);
ContainerRegistryContext.displayName = "HexDI.ContainerRegistry";
