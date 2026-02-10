/**
 * useInspector hook for accessing the InspectorAPI from InspectorProvider.
 *
 * This hook provides access to the container inspector instance for
 * querying container state, subscribing to events, and building
 * inspection UIs.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { InspectorAPI } from "@hex-di/core";
import { InspectorContext } from "../context/inspector-context.js";
import { MissingProviderError } from "../errors.js";

/**
 * Hook that returns the InspectorAPI from the nearest InspectorProvider.
 *
 * @returns The InspectorAPI instance from InspectorProvider
 *
 * @throws {MissingProviderError} If called outside an InspectorProvider.
 *   This indicates a programming error - components using useInspector
 *   must be descendants of an InspectorProvider.
 *
 * @example Basic usage
 * ```tsx
 * function DebugPanel() {
 *   const inspector = useInspector();
 *   const ports = inspector.listPorts();
 *   return <ul>{ports.map(p => <li key={p}>{p}</li>)}</ul>;
 * }
 * ```
 */
export function useInspector(): InspectorAPI {
  const context = useContext(InspectorContext);

  if (context === null) {
    throw new MissingProviderError("useInspector", "InspectorProvider");
  }

  return context.inspector;
}
