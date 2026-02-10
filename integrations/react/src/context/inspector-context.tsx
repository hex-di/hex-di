/**
 * Inspector Context for @hex-di/react.
 *
 * Provides the React context for storing the InspectorAPI reference,
 * enabling container inspection hooks.
 *
 * @packageDocumentation
 * @internal
 */

import { createContext } from "react";
import type { InspectorAPI } from "@hex-di/core";

// =============================================================================
// Inspector Context Value Types
// =============================================================================

/**
 * Context value structure for the inspector context.
 *
 * @internal
 */
export interface InspectorContextValue {
  readonly inspector: InspectorAPI;
}

// =============================================================================
// Inspector Context
// =============================================================================

/**
 * React Context for the container inspector.
 *
 * This context stores the InspectorAPI reference and is used by
 * inspection hooks (useInspector, useSnapshot, useScopeTree, useUnifiedSnapshot).
 *
 * The context value is null when outside an InspectorProvider.
 * Hooks should check for null and throw MissingProviderError.
 *
 * @internal
 */
export const InspectorContext = createContext<InspectorContextValue | null>(null);
InspectorContext.displayName = "HexDI.InspectorContext";
