/**
 * Internal React Context infrastructure for @hex-di/react.
 *
 * This module provides the context system that enables React components
 * to access the DI container and scopes. The context is branded to prevent
 * structural compatibility issues between different createTypedHooks calls.
 *
 * @remarks
 * - Context is internal and not exported from the package barrel
 * - ContainerProvider, ScopeProvider, and AutoScopeProvider are re-exported
 * - The branded context pattern ensures type safety across factory boundaries
 *
 * @packageDocumentation
 */

import { createContext, useEffect, useContext, useRef, type ReactNode } from "react";
import type { Port, InferService } from "@hex-di/ports";
import type { Scope, ContainerPhase } from "@hex-di/runtime";
import { MissingProviderError } from "./errors.js";
import {
  toRuntimeContainerRef,
  toRuntimeScopeRef,
  type RuntimeContainerRef,
  type RuntimeResolverRef,
} from "./internal/runtime-refs.js";

// =============================================================================
// Brand Symbol for Context
// =============================================================================

/**
 * Unique symbol used for branding context values.
 *
 * This symbol ensures that context values from different createTypedHooks
 * calls are not structurally compatible, preventing accidental mixing of
 * different container trees.
 *
 * NOTE: This is a phantom type - it exists only at the type level.
 * The global contexts in this file don't use the brand because they
 * use Port<unknown, string> as the base type, allowing any container.
 *
 * @internal
 */
declare const ContextBrand: unique symbol;

// =============================================================================
// Container Type Detection
// =============================================================================

/**
 * Structural type representing what ContainerProvider needs from a container.
 *
 * With the unified Container type, root and child containers have different
 * conditional properties (initialize, parent). This structural type includes
 * only the common properties that both container types share, allowing
 * ContainerProvider to accept either.
 *
 * @internal
 */
type AnyContainer<TProvides extends Port<unknown, string>> = {
  resolve<P extends TProvides>(port: P): InferService<P>;
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;
  createScope(): Scope<TProvides, Port<unknown, string>, ContainerPhase>;
  dispose(): Promise<void>;
  has(port: Port<unknown, string>): boolean;
  readonly isDisposed: boolean;
  readonly isInitialized: boolean;
  // parent property is accessed via try/catch for child detection
  // not included here to avoid type conflicts between root (never) and child (Container)
  readonly parent?: unknown;
};

/**
 * Checks if the provided container is a child container.
 *
 * With the unified Container type, child containers are distinguished by
 * having a `parent` property that doesn't throw. Root containers' `parent`
 * property throws when accessed.
 *
 * @param container - The container to check
 * @returns true if the container is a child container, false otherwise
 *
 * @internal
 */
function isChildContainer<TProvides extends Port<unknown, string>>(
  container: AnyContainer<TProvides>
): boolean {
  try {
    // Accessing parent on root container throws, on child container returns parent
    const _parent = container.parent;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Internal Context Value Types
// =============================================================================

/**
 * Local resolver type representing either a Container, ChildContainer, or Scope.
 *
 * We now use RuntimeResolverRef which provides bivariant method signatures,
 * eliminating the need for type casts when storing containers in context.
 *
 * @internal
 */
type LocalResolver = RuntimeResolverRef;

/**
 * Internal context value structure for the container context.
 *
 * This stores the root container reference, which is needed for:
 * - Creating new scopes via `useScope` hook
 * - Detecting nested ContainerProvider (single container per tree, or child containers nested)
 *
 * Uses RuntimeContainerRef which provides bivariant method signatures,
 * eliminating the need for type casts when storing containers in context.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 *
 * @internal
 */
export interface ContainerContextValue<TProvides extends Port<unknown, string>> {
  /**
   * The container provided by ContainerProvider.
   * Uses RuntimeContainerRef for bivariant storage.
   */
  readonly container: RuntimeContainerRef;

  /**
   * Flag indicating whether this is a child container.
   * Used to detect if nesting is allowed (child containers can be nested).
   */
  readonly isChildContainer: boolean;

  /**
   * Brand property for nominal typing.
   * Prevents structural compatibility between different createTypedHooks contexts.
   */
  readonly [ContextBrand]: { provides: TProvides };
}

/**
 * Internal context value structure for the resolver context.
 *
 * This stores the current resolver (Container or Scope), which may differ
 * from the root container when inside a ScopeProvider or AutoScopeProvider.
 *
 * Uses RuntimeResolverRef which provides bivariant method signatures,
 * eliminating the need for type casts when storing resolvers in context.
 *
 * @typeParam TProvides - Union of Port types that can be resolved
 *
 * @internal
 */
export interface ResolverContextValue<TProvides extends Port<unknown, string>> {
  /**
   * The current resolver - either the root container or a scope.
   * Uses RuntimeResolverRef for bivariant storage.
   */
  readonly resolver: LocalResolver;

  /**
   * Brand property for nominal typing.
   * Prevents structural compatibility between different createTypedHooks contexts.
   */
  readonly [ContextBrand]: { provides: TProvides };
}

// =============================================================================
// Runtime Context Value Types (without brand)
// =============================================================================

/**
 * Runtime container context value without the phantom brand.
 * Uses RuntimeContainerRef for bivariant storage.
 * @internal
 */
interface RuntimeContainerContextValue {
  readonly container: RuntimeContainerRef;
  readonly isChildContainer: boolean;
}

/**
 * Runtime resolver context value without the phantom brand.
 * Uses RuntimeResolverRef for bivariant storage.
 * @internal
 */
interface RuntimeResolverContextValue {
  readonly resolver: LocalResolver;
}

// =============================================================================
// React Contexts
// =============================================================================

/**
 * React Context for the root container.
 *
 * This context stores the root container and is used to:
 * - Detect nested ContainerProvider (which is an error)
 * - Access the container for scope creation via useContainer
 *
 * @remarks
 * The context value is null when outside a ContainerProvider.
 * Hooks should check for null and throw MissingProviderError.
 * Uses RuntimeContainerContextValue (without brand) since brand is a phantom type.
 *
 * @internal
 */
export const ContainerContext = createContext<RuntimeContainerContextValue | null>(null);
ContainerContext.displayName = "HexDI.ContainerContext";

/**
 * React Context for the current resolver (Container or Scope).
 *
 * This context stores the nearest resolver and is used by:
 * - usePort hook for service resolution
 * - AutoScopeProvider for creating child scopes
 *
 * @remarks
 * The resolver context is separate from the container context so that
 * ScopeProvider and AutoScopeProvider can override the resolver while
 * preserving access to the root container.
 * Uses RuntimeResolverContextValue (without brand) since brand is a phantom type.
 *
 * @internal
 */
export const ResolverContext = createContext<RuntimeResolverContextValue | null>(null);
ResolverContext.displayName = "HexDI.ResolverContext";

// =============================================================================
// ContainerProvider Component
// =============================================================================

/**
 * Props for the ContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 */
export interface ContainerProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The pre-created Container instance to provide to the React tree.
   *
   * @remarks
   * The container must be created externally using `createContainer` from
   * `@hex-di/runtime`, or via `container.createChild().build()` for child containers.
   * The Provider does not create or manage the container's lifecycle -
   * the caller is responsible for disposal.
   */
  readonly container: AnyContainer<TProvides>;

  /**
   * React children that will have access to the container via hooks.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that makes a DI container available to React components.
 *
 * ContainerProvider establishes the root of a DI tree in React. All hooks
 * (usePort, useContainer, etc.) require a ContainerProvider ancestor.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 *
 * @param props - The provider props including container and children
 *
 * @throws {MissingProviderError} If nested inside another ContainerProvider with a root container.
 *   Child containers can be nested, but root containers cannot.
 *
 * @remarks
 * - Root ContainerProvider allows one per React tree (nested root providers throw)
 * - Child containers can be nested inside parent providers
 * - The container prop should come from `createContainer()` or `container.createChild().build()` in @hex-di/runtime
 * - Provider does NOT manage container lifecycle - caller owns disposal
 * - Children can access container via useContainer hook
 * - Children can resolve services via usePort hook
 *
 * @example Basic usage
 * ```tsx
 * import { createContainer } from '@hex-di/runtime';
 * import { ContainerProvider, usePort } from '@hex-di/react';
 *
 * const container = createContainer(graph);
 *
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <MyComponent />
 *     </ContainerProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const logger = usePort(LoggerPort);
 *   return <div>{logger.name}</div>;
 * }
 * ```
 *
 * @example Nested child container
 * ```tsx
 * const childContainer = container.createChild().override(MockLoggerAdapter).build();
 *
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <ContainerProvider container={childContainer}>
 *         <ComponentWithMockLogger />
 *       </ContainerProvider>
 *     </ContainerProvider>
 *   );
 * }
 * ```
 */
export function ContainerProvider<TProvides extends Port<unknown, string>>({
  container,
  children,
}: ContainerProviderProps<TProvides>): React.ReactNode {
  // Detect nested ContainerProvider
  const existingContext = useContext(ContainerContext);

  // Check if the new container is a child container using the type guard.
  const containerIsChild = isChildContainer(container);

  // If there's an existing context and the new container is NOT a child container,
  // this is an error (cannot nest root containers)
  if (existingContext !== null && !containerIsChild) {
    throw new MissingProviderError(
      "ContainerProvider",
      "ContainerProvider (nested providers not allowed)"
    );
  }

  // Convert to bivariant runtime ref.
  // No type cast needed because toRuntimeContainerRef explicitly constructs
  // an object with bivariant methods. Works for both root and child containers.
  const containerRef = toRuntimeContainerRef(container);

  // Create context values using the bivariant runtime refs.
  const containerContextValue: RuntimeContainerContextValue = {
    container: containerRef,
    isChildContainer: containerIsChild,
  };

  const resolverContextValue: RuntimeResolverContextValue = {
    resolver: containerRef,
  };

  return (
    <ContainerContext.Provider value={containerContextValue}>
      <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
    </ContainerContext.Provider>
  );
}

// =============================================================================
// ScopeProvider Component
// =============================================================================

/**
 * Props for the ScopeProvider component.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 */
export interface ScopeProviderProps<TProvides extends Port<unknown, string>> {
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
 * ScopeProvider allows you to inject an externally managed scope into the
 * React tree. This is useful when you need manual control over scope lifecycle.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 *
 * @param props - The provider props including scope and children
 *
 * @remarks
 * - Does NOT dispose scope on unmount - caller owns the scope lifecycle
 * - Nested components use this scope for service resolution
 * - Does not require ContainerProvider parent (but useContainer won't work without one)
 * - For automatic scope lifecycle, use AutoScopeProvider instead
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
 *     <ScopeProvider scope={scope}>
 *       <RequestContent />
 *     </ScopeProvider>
 *   );
 * }
 * ```
 */
export function ScopeProvider<TProvides extends Port<unknown, string>>({
  scope,
  children,
}: ScopeProviderProps<TProvides>): React.ReactNode {
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

// =============================================================================
// AutoScopeProvider Component
// =============================================================================

/**
 * Props for the AutoScopeProvider component.
 */
export interface AutoScopeProviderProps {
  /**
   * React children that will resolve services from the auto-managed scope.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that automatically manages scope lifecycle.
 *
 * AutoScopeProvider creates a new scope on mount and disposes it on unmount,
 * tying the scope lifecycle to the React component lifecycle.
 *
 * @param props - The provider props containing children
 *
 * @throws {MissingProviderError} If used outside a ContainerProvider.
 *   AutoScopeProvider requires a container to create scopes from.
 *
 * @remarks
 * - Creates scope from current resolver (container or parent scope) on mount
 * - Automatically disposes scope on unmount via useEffect cleanup
 * - Supports nesting - child AutoScopeProvider creates scope from parent scope
 * - Uses useEffect (not useLayoutEffect) for SSR compatibility
 * - Renders children immediately with the new scope context
 *
 * @example Automatic scope for a page
 * ```tsx
 * function UserPage() {
 *   return (
 *     <AutoScopeProvider>
 *       <UserProfile />
 *       <UserSettings />
 *     </AutoScopeProvider>
 *   );
 * }
 * ```
 *
 * @example Nested scopes
 * ```tsx
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <AutoScopeProvider>
 *         <AutoScopeProvider>
 *           <Component />
 *         </AutoScopeProvider>
 *       </AutoScopeProvider>
 *     </ContainerProvider>
 *   );
 * }
 * ```
 */
export function AutoScopeProvider({ children }: AutoScopeProviderProps): React.ReactNode {
  // Get current resolver context - must be inside ContainerProvider
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("AutoScopeProvider", "ContainerProvider");
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
    scopeRef.current = resolverContext.resolver.createScope();
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
