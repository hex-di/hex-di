/**
 * HexDiAutoScopeProvider component for @hex-di/react.
 *
 * Provides automatic scope lifecycle management tied to React component lifecycle.
 *
 * @packageDocumentation
 */

import { useEffect, useContext, useRef, type ReactNode } from "react";
import { MissingProviderError } from "../errors.js";
import { ResolverContext } from "../context/resolver-context.js";
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
 * - Uses deferred disposal to handle React StrictMode correctly
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

  // Track scope and its name using ref
  // The ref persists across renders but we check isDisposed to handle StrictMode
  const scopeRef = useRef<{ scope: RuntimeResolverRef; name: string | undefined } | null>(null);

  // Track pending disposal timeout - used to cancel disposal if component remounts
  const disposalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create scope if needed (first render, disposed, or name changed)
  // This runs during render to ensure scope is available immediately
  if (
    scopeRef.current === null ||
    scopeRef.current.scope.isDisposed ||
    scopeRef.current.name !== name
  ) {
    scopeRef.current = {
      scope: resolverContext.resolver.createScope(name),
      name,
    };
  }

  const scope = scopeRef.current.scope;

  // Handle scope lifecycle with deferred disposal for StrictMode compatibility
  //
  // In React StrictMode, effects run twice: setup → cleanup → setup again.
  // If we dispose the scope synchronously in cleanup, child components that
  // trigger re-renders (e.g., via store subscriptions that call listeners immediately)
  // will try to use the disposed scope before AutoScopeProvider can create a new one.
  //
  // Solution: Defer disposal using setTimeout(fn, 0). This ensures:
  // 1. In StrictMode: cleanup schedules disposal, but effect re-runs and cancels it
  // 2. In real unmount: cleanup schedules disposal, no effect re-runs, disposal executes
  useEffect(() => {
    // Effect is running - cancel any pending disposal from a previous cleanup
    // This handles StrictMode's cleanup → setup cycle
    if (disposalTimeoutRef.current !== null) {
      clearTimeout(disposalTimeoutRef.current);
      disposalTimeoutRef.current = null;
    }

    return () => {
      // Capture current scope reference for the timeout callback
      const currentScope = scopeRef.current;

      // Schedule disposal for the next event loop tick
      // If this is StrictMode, the effect will re-run and cancel this timeout
      // If this is a real unmount, the timeout will fire and dispose the scope
      disposalTimeoutRef.current = setTimeout(() => {
        if (currentScope !== null && !currentScope.scope.isDisposed) {
          void currentScope.scope.dispose();
        }
      }, 0);
    };
  }, []);

  return (
    <ResolverContext.Provider value={{ resolver: scope }}>{children}</ResolverContext.Provider>
  );
}
