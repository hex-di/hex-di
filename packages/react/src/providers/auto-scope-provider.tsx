/**
 * HexDiAutoScopeProvider component for @hex-di/react.
 *
 * Provides automatic scope lifecycle management tied to React component lifecycle.
 *
 * @packageDocumentation
 */

import { useEffect, useContext, useRef, type ReactNode } from "react";
import { MissingProviderError } from "../errors.js";
import { ResolverContext, type RuntimeResolverContextValue } from "../context/resolver-context.js";
import type { RuntimeResolverRef } from "../internal/runtime-refs.js";

// =============================================================================
// HexDiAutoScopeProvider Component
// =============================================================================

/**
 * Props for the HexDiAutoScopeProvider component.
 */
export interface HexDiAutoScopeProviderProps {
  /**
   * Optional custom name for the scope (for DevTools identification).
   * If not provided, an auto-generated name like "scope-0" will be used.
   */
  readonly name?: string;

  /**
   * React children that will resolve services from the auto-managed scope.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that automatically manages scope lifecycle.
 *
 * HexDiAutoScopeProvider creates a new scope on mount and disposes it on unmount,
 * tying the scope lifecycle to the React component lifecycle.
 *
 * @param props - The provider props containing children
 *
 * @throws {MissingProviderError} If used outside a HexDiContainerProvider.
 *   HexDiAutoScopeProvider requires a container to create scopes from.
 *
 * @remarks
 * - Creates scope from current resolver (container or parent scope) on mount
 * - Automatically disposes scope on unmount via useEffect cleanup
 * - Supports nesting - child HexDiAutoScopeProvider creates scope from parent scope
 * - Uses useEffect (not useLayoutEffect) for SSR compatibility
 * - Renders children immediately with the new scope context
 *
 * @example Automatic scope for a page
 * ```tsx
 * function UserPage() {
 *   return (
 *     <HexDiAutoScopeProvider>
 *       <UserProfile />
 *       <UserSettings />
 *     </HexDiAutoScopeProvider>
 *   );
 * }
 * ```
 *
 * @example Nested scopes
 * ```tsx
 * function App() {
 *   return (
 *     <HexDiContainerProvider container={container}>
 *       <HexDiAutoScopeProvider>
 *         <HexDiAutoScopeProvider>
 *           <Component />
 *         </HexDiAutoScopeProvider>
 *       </HexDiAutoScopeProvider>
 *     </HexDiContainerProvider>
 *   );
 * }
 * ```
 */
export function HexDiAutoScopeProvider({
  name,
  children,
}: HexDiAutoScopeProviderProps): React.ReactNode {
  // Get current resolver context - must be inside HexDiContainerProvider
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("HexDiAutoScopeProvider", "HexDiContainerProvider");
  }

  // Use ref to track the scope - allows recreation if disposed (StrictMode)
  // Note: useRef is used instead of useState to handle StrictMode correctly.
  // In StrictMode, components mount/unmount/remount, but useState caches
  // the scope while useEffect cleanup disposes it. Using useRef with
  // isDisposed check allows recreation of disposed scopes.
  // Uses RuntimeScopeRef which provides bivariant method signatures.
  const scopeRef = useRef<RuntimeResolverRef | null>(null);

  // Create or recreate scope if needed during initial render
  // This handles StrictMode where scope may have been disposed during unmount
  if (scopeRef.current === null || scopeRef.current.isDisposed) {
    // createScope() on RuntimeResolverRef returns RuntimeScopeRef.
    // No type cast needed - the bivariant types flow through.
    scopeRef.current = resolverContext.resolver.createScope(name);
  }

  // Dispose scope on unmount using useEffect (SSR compatible)
  useEffect(() => {
    return () => {
      // Only dispose if scope exists and not already disposed
      if (scopeRef.current !== null && !scopeRef.current.isDisposed) {
        // Note: dispose is async but we don't await in cleanup
        // This is intentional - React cleanup functions should be sync
        void scopeRef.current.dispose();
      }
    };
  }, []);

  // Create resolver context value with the new scope.
  const resolverContextValue: RuntimeResolverContextValue = {
    resolver: scopeRef.current,
  };

  return (
    <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
  );
}
