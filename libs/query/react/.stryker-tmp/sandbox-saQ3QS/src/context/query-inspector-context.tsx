/**
 * QueryInspector React Context
 *
 * Provides a QueryInspectorAPI instance to child components via React context.
 * Used by inspection hooks (useQuerySnapshot, useQueryDiagnostics, etc.)
 * to access the inspector without prop drilling.
 *
 * @packageDocumentation
 */

import { createContext, useContext, type ReactNode } from "react";
import type { QueryInspectorAPI } from "@hex-di/query";

// =============================================================================
// Context
// =============================================================================

const QueryInspectorContext = createContext<QueryInspectorAPI | undefined>(undefined);
QueryInspectorContext.displayName = "QueryInspectorContext";

// =============================================================================
// QueryInspectorProvider
// =============================================================================

export interface QueryInspectorProviderProps {
  readonly inspector: QueryInspectorAPI;
  readonly children: ReactNode;
}

/**
 * Provides a QueryInspectorAPI instance to child hooks via React context.
 *
 * The inspector is passed explicitly, keeping it decoupled from
 * container resolution.
 *
 * @example
 * ```tsx
 * const inspector = createQueryInspector(queryClient);
 * <QueryInspectorProvider inspector={inspector}>
 *   <MyDashboard />
 * </QueryInspectorProvider>
 * ```
 */
export function QueryInspectorProvider({
  inspector,
  children,
}: QueryInspectorProviderProps): React.ReactNode {
  return (
    <QueryInspectorContext.Provider value={inspector}>{children}</QueryInspectorContext.Provider>
  );
}

// =============================================================================
// useQueryInspector
// =============================================================================

/**
 * Access the QueryInspectorAPI from the nearest QueryInspectorProvider.
 *
 * @throws Error if used outside a QueryInspectorProvider
 */
export function useQueryInspector(): QueryInspectorAPI {
  const inspector = useContext(QueryInspectorContext);
  if (inspector === undefined) {
    throw new Error(
      "useQueryInspector must be used within a QueryInspectorProvider. " +
        "Wrap your component tree with <QueryInspectorProvider inspector={inspector}>."
    );
  }
  return inspector;
}
