/**
 * Container Registry Context for multi-container DevTools support.
 *
 * Tracks all containers in the application (root, child, lazy, scope)
 * and provides selection state for the DevTools inspector.
 *
 * Uses Rust-like Option<T> for optional values instead of nullable types.
 *
 * @packageDocumentation
 */

import { createContext } from "react";
import type { ContainerKind } from "@hex-di/inspector";
import type { Option } from "../types/adt.js";
import type { InspectableContainer } from "../types/inspectable-container.js";

// =============================================================================
// Container Entry Types
// =============================================================================

/**
 * Entry for a tracked container in DevTools.
 *
 * Stores the container reference directly (as InspectableContainer trait object)
 * instead of InspectorAPI. This enables per-container RuntimeInspector creation
 * via createInspector(), fixing the bug where all containers showed root data.
 */
/**
 * Inheritance mode for child containers.
 *
 * - shared: Child uses parent's singletons directly
 * - forked: Child gets independent copies of parent's singletons
 * - isolated: Child is completely isolated from parent
 */
export type InheritanceMode = "shared" | "forked" | "isolated";

export interface ContainerEntry {
  /** Unique identifier for this container */
  readonly id: string;

  /** Human-readable label for display */
  readonly label: string;

  /** Container type (root, child, lazy, scope) */
  readonly kind: ContainerKind;

  /** Container reference for inspection (trait object pattern) */
  readonly container: InspectableContainer;

  /** Parent container ID, if any */
  readonly parentId: string | null;

  /** Timestamp when the container was registered */
  readonly createdAt: number;

  /** Inheritance mode for child containers (only present for kind === "child") */
  readonly inheritanceMode?: InheritanceMode;
}

// =============================================================================
// Container Registry Context Value
// =============================================================================

/**
 * Context value for multi-container DevTools.
 *
 * Uses Option<T> for optional values, enabling exhaustive pattern matching
 * instead of null checks. All selection-related fields use Option.
 */
export interface ContainerRegistryValue {
  /** All registered containers */
  readonly containers: ReadonlyMap<string, ContainerEntry>;

  /** Currently selected container ID (Option instead of string | null) */
  readonly selectedId: Option<string>;

  /** Select a container for inspection (accepts Option<string>) */
  readonly selectContainer: (id: Option<string>) => void;

  /** Get the currently selected container (Option instead of nullable) */
  readonly selectedContainer: Option<InspectableContainer>;

  /** Get the currently selected container entry (Option instead of nullable) */
  readonly selectedEntry: Option<ContainerEntry>;

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
 * useContainerList and useContainerInspector to access container data.
 *
 * @example
 * ```typescript
 * import {
 *   ContainerRegistryProvider,
 *   useContainerList,
 *   useContainerInspector
 * } from "@hex-di/devtools";
 * import { isSome, Some, None } from "@hex-di/devtools/react/types/adt";
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
 *   const inspectorOpt = useContainerInspector();
 *
 *   return (
 *     <div>
 *       <select
 *         value={isSome(selectedId) ? selectedId.value : ""}
 *         onChange={(e) => selectContainer(
 *           e.target.value ? Some(e.target.value) : None
 *         )}
 *       >
 *         {Array.from(containers.values()).map((entry) => (
 *           <option key={entry.id} value={entry.id}>
 *             {entry.label} ({entry.kind})
 *           </option>
 *         ))}
 *       </select>
 *
 *       {isSome(inspectorOpt) && (
 *         <pre>{JSON.stringify(inspectorOpt.value.snapshot(), null, 2)}</pre>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export const ContainerRegistryContext = createContext<ContainerRegistryValue | null>(null);
ContainerRegistryContext.displayName = "HexDI.ContainerRegistry";
