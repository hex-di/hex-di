/**
 * ContainerProvider component for @hex-di/react.
 *
 * Provides the root ContainerProvider that makes a DI container
 * available to React components.
 *
 * @packageDocumentation
 */

import { useContext, type ReactNode } from "react";
import type { Port, InferService } from "@hex-di/ports";
import type { Scope, ContainerPhase } from "@hex-di/runtime";
import { MissingProviderError } from "../errors.js";
import {
  ContainerContext,
  type RuntimeContainerContextValue,
} from "../context/container-context.js";
import { ResolverContext, type RuntimeResolverContextValue } from "../context/resolver-context.js";
import { toRuntimeContainerRef } from "../internal/runtime-refs.js";

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
