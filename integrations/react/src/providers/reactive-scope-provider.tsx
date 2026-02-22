/**
 * ReactiveScopeProvider - External scope lifecycle management for React.
 *
 * This component enables a reactive pattern where scopes created outside React
 * can trigger automatic component unmounting when disposed. This is useful for:
 *
 * - **Logout/Session End**: Dispose user scope on logout, unmount user-specific UI
 * - **Resource Cleanup**: Connection closes, show reconnect UI
 * - **Multi-Tenant Switching**: Dispose workspace scope, swap UI trees
 * - **Request Lifecycle**: SSR request ends, clean up request-scoped components
 *
 * @packageDocumentation
 */

import { useSyncExternalStore, type ReactNode } from "react";
import type { Port } from "@hex-di/core";
import type { Scope, ScopeLifecycleListener, ScopeDisposalState } from "@hex-di/runtime";
import { toRuntimeScopeRef, type RuntimeResolverRef } from "../internal/runtime-refs.js";
import { ResolverContext, type RuntimeResolverContextValue } from "../context/resolver-context.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the ReactiveScopeProvider component.
 *
 * @typeParam TProvides - Union of Port types the scope can resolve
 */
export interface ReactiveScopeProviderProps<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
> {
  /**
   * The externally managed scope instance.
   *
   * This scope must have `subscribe()` and `getDisposalState()` methods,
   * which are available on all scopes created by `container.createScope()`.
   */
  readonly scope: Scope<TProvides, TAsyncPorts, TPhase>;

  /**
   * React children that will resolve services from this scope.
   * Automatically unmounted when scope is disposed.
   */
  readonly children: ReactNode;

  /**
   * Fallback to render when scope is disposed or disposing.
   * If not provided, renders null (effectively unmounts children).
   *
   * @default null
   */
  readonly fallback?: ReactNode;

  /**
   * Whether to unmount children during 'disposing' state.
   *
   * If true (default), children unmount immediately when dispose() is called,
   * before async cleanup completes. This provides immediate UI feedback.
   *
   * If false, children remain mounted until async disposal completes.
   *
   * @default true
   */
  readonly unmountOnDisposing?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Provider that reacts to external scope disposal.
 *
 * When `scope.dispose()` is called from anywhere (outside React),
 * this provider automatically unmounts its children and optionally
 * renders a fallback.
 *
 * @param props - The provider props
 *
 * @remarks
 * - Uses `useSyncExternalStore` for concurrent mode safety
 * - Handles React StrictMode correctly
 * - Works with SSR (uses getServerSnapshot)
 * - Multiple providers using the same scope all update when disposed
 *
 * @example Logout/Session End
 * ```tsx
 * const userScope = container.createScope();
 *
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <ReactiveScopeProvider
 *         scope={userScope}
 *         fallback={<LoginScreen />}
 *       >
 *         <UserDashboard />
 *       </ReactiveScopeProvider>
 *     </ContainerProvider>
 *   );
 * }
 *
 * // On logout button click (anywhere in app):
 * async function handleLogout() {
 *   await userScope.dispose(); // React UI automatically switches to LoginScreen
 * }
 * ```
 *
 * @example Multi-Tenant Switching
 * ```tsx
 * function WorkspacePanel({ workspaceScope }) {
 *   return (
 *     <ReactiveScopeProvider
 *       scope={workspaceScope}
 *       fallback={<WorkspaceLoading />}
 *     >
 *       <WorkspaceContent />
 *     </ReactiveScopeProvider>
 *   );
 * }
 *
 * // Switch workspace:
 * async function switchWorkspace(newWorkspaceId) {
 *   await currentWorkspaceScope.dispose(); // Old UI unmounts
 *   currentWorkspaceScope = container.createScope();
 *   // ... load new workspace data
 * }
 * ```
 *
 * @example Keeping Children During Disposal
 * ```tsx
 * // Children stay mounted until async disposal completes
 * <ReactiveScopeProvider
 *   scope={scope}
 *   fallback={<DisposingSpinner />}
 *   unmountOnDisposing={false}
 * >
 *   <Content />
 * </ReactiveScopeProvider>
 * ```
 */
export function ReactiveScopeProvider<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
>({
  scope,
  children,
  fallback = null,
  unmountOnDisposing = true,
}: ReactiveScopeProviderProps<TProvides, TAsyncPorts, TPhase>): ReactNode {
  // Subscribe to scope lifecycle using useSyncExternalStore
  // This is the React-recommended way to subscribe to external stores
  const state = useSyncExternalStore<ScopeDisposalState>(
    // subscribe: called to register listener
    onStoreChange => {
      const listener: ScopeLifecycleListener = () => {
        // Notify React that external state changed
        onStoreChange();
      };
      return scope.subscribe(listener);
    },
    // getSnapshot: return current state for client
    () => {
      return scope.getDisposalState();
    },
    // getServerSnapshot: return state for SSR
    // Fall back to isDisposed check for SSR safety
    () => {
      return scope.isDisposed ? "disposed" : "active";
    }
  );

  // Determine if we should render children or fallback
  const shouldRenderChildren = state === "active" || (state === "disposing" && !unmountOnDisposing);

  if (!shouldRenderChildren) {
    return fallback;
  }

  // Convert scope to runtime ref for context storage
  const scopeRef: RuntimeResolverRef = toRuntimeScopeRef(scope);

  // Create resolver context value with the scope
  const resolverContextValue: RuntimeResolverContextValue = {
    resolver: scopeRef,
  };

  return (
    <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
  );
}
