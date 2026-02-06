/**
 * HexDiScopeProvider component for @hex-di/react.
 *
 * Provides manual scope management for React components.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { Port } from "@hex-di/core";
import type { Scope } from "@hex-di/runtime";
import { ResolverContext, type RuntimeResolverContextValue } from "../context/resolver-context.js";
import { toRuntimeScopeRef } from "../internal/runtime-refs.js";

// =============================================================================
// HexDiScopeProvider Component
// =============================================================================

/**
 * Props for the HexDiScopeProvider component.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 */
export interface HexDiScopeProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The externally managed Scope instance to provide to the React tree.
   *
   * @remarks
   * The scope must be created externally using `container.createScope()` or
   * `scope.createScope()`. The Provider does NOT manage the scope's lifecycle -
   * the caller is responsible for disposal.
   */
  readonly scope: Scope<TProvides>;

  /**
   * React children that will resolve services from this scope.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that overrides the resolver context with a manual scope.
 *
 * HexDiScopeProvider allows you to inject an externally managed scope into the
 * React tree. This is useful when you need manual control over scope lifecycle.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 *
 * @param props - The provider props including scope and children
 *
 * @remarks
 * - Does NOT dispose scope on unmount - caller owns the scope lifecycle
 * - Nested components use this scope for service resolution
 * - Does not require HexDiContainerProvider parent (but useContainer won't work without one)
 * - For automatic scope lifecycle, use HexDiAutoScopeProvider instead
 *
 * @example Manual scope management
 * ```tsx
 * function RequestHandler() {
 *   const container = useContainer();
 *   const [scope] = useState(() => container.createScope());
 *
 *   useEffect(() => {
 *     return () => { scope.dispose(); };
 *   }, [scope]);
 *
 *   return (
 *     <HexDiScopeProvider scope={scope}>
 *       <RequestContent />
 *     </HexDiScopeProvider>
 *   );
 * }
 * ```
 */
export function HexDiScopeProvider<TProvides extends Port<unknown, string>>({
  scope,
  children,
}: HexDiScopeProviderProps<TProvides>): React.ReactNode {
  // Convert to bivariant runtime ref. No type cast needed because
  // toRuntimeScopeRef explicitly constructs an object with bivariant methods.
  const scopeRef = toRuntimeScopeRef(scope);

  const resolverContextValue: RuntimeResolverContextValue = {
    resolver: scopeRef,
  };

  return (
    <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
  );
}
