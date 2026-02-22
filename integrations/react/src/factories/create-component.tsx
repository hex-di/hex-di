/**
 * Standalone function for creating React components with explicit dependencies.
 *
 * Following the same pattern as `createAdapter` from @hex-di/graph, this
 * function provides a declarative way to define components with their
 * DI dependencies visible at definition time.
 *
 * @packageDocumentation
 */

import { useContext, type FC, type ReactNode } from "react";
import type { Port, InferService, InferPortName } from "@hex-di/core";
import { ResolverContext } from "../context/resolver-context.js";
import { MissingProviderError } from "../errors.js";

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Converts a readonly tuple of ports to a union type.
 *
 * @example
 * ```typescript
 * type Ports = TupleToUnion<readonly [typeof LoggerPort, typeof DbPort]>;
 * // typeof LoggerPort | typeof DbPort
 * ```
 */
type TupleToUnion<T extends readonly unknown[]> = T[number];

/**
 * Maps a union of Port types to an object type for dependency injection.
 *
 * This mirrors the ResolvedDeps type from @hex-di/graph but is defined
 * locally to avoid circular dependencies.
 *
 * @example
 * ```typescript
 * type Deps = ComponentResolvedDeps<typeof LoggerPort | typeof DbPort>;
 * // { Logger: LoggerService; Database: DatabaseService }
 * ```
 */
type ComponentResolvedDeps<TRequires> = [TRequires] extends [never]
  ? Record<string, never>
  : {
      [P in TRequires as InferPortName<P> & string]: InferService<P>;
    };

// =============================================================================
// Component Configuration
// =============================================================================

/**
 * Configuration for creating a component with DI dependencies.
 *
 * @typeParam TRequires - Tuple of ports this component requires
 * @typeParam TProps - The React props type for the component
 *
 * @example
 * ```typescript
 * const config: ComponentConfig<
 *   readonly [typeof LoggerPort, typeof UserServicePort],
 *   { userId: string }
 * > = {
 *   requires: [LoggerPort, UserServicePort],
 *   render: ({ Logger, UserService }, { userId }) => {
 *     const user = UserService.getUser(userId);
 *     Logger.info(`Rendering user: ${user.name}`);
 *     return <div>{user.name}</div>;
 *   }
 * };
 * ```
 */
export interface ComponentConfig<
  TRequires extends readonly Port<string, unknown>[],
  TProps extends object = Record<string, never>,
> {
  /**
   * The ports this component requires from the DI container.
   *
   * Dependencies are resolved from the nearest ContainerProvider or
   * ScopeProvider context when the component renders.
   */
  readonly requires: TRequires;

  /**
   * Render function that receives resolved dependencies and component props.
   *
   * @param deps - Object with resolved dependencies, keyed by port name
   * @param props - React props passed to the component
   * @returns React node to render
   */
  readonly render: (
    deps: ComponentResolvedDeps<TupleToUnion<TRequires>>,
    props: TProps
  ) => ReactNode;
}

// =============================================================================
// createComponent Function
// =============================================================================

/**
 * Creates a React component with explicit dependencies.
 *
 * This function follows the same pattern as `createAdapter` from @hex-di/graph,
 * providing a declarative way to define React components with their DI
 * dependencies visible at definition time.
 *
 * **Key Benefits:**
 * - Dependencies are visible at component definition (not hidden in hooks)
 * - Follows the `createAdapter` pattern for consistency
 * - Full type inference for deps object based on requires array
 * - Components are standalone and reusable
 *
 * @typeParam TRequires - Tuple of ports this component requires
 * @typeParam TProps - The React props type for the component
 *
 * @param config - Component configuration with requires and render
 * @returns A React functional component with typed props
 *
 * @throws {MissingProviderError} At render time if used outside ContainerProvider
 *
 * @example Basic usage
 * ```typescript
 * const UserProfile = createComponent({
 *   requires: [LoggerPort, UserServicePort],
 *   render: ({ Logger, UserService }, { userId }: { userId: string }) => {
 *     const user = UserService.getUser(userId);
 *     Logger.info(`Rendering user: ${user.name}`);
 *     return <div>{user.name}</div>;
 *   }
 * });
 *
 * // Usage in React
 * <ContainerProvider container={container}>
 *   <UserProfile userId="123" />
 * </ContainerProvider>
 * ```
 *
 * @example No dependencies
 * ```typescript
 * const SimpleComponent = createComponent({
 *   requires: [],
 *   render: (_, { message }: { message: string }) => {
 *     return <div>{message}</div>;
 *   }
 * });
 * ```
 *
 * @example With empty props
 * ```typescript
 * const StatusDisplay = createComponent({
 *   requires: [StatusServicePort],
 *   render: ({ StatusService }) => {
 *     return <div>Status: {StatusService.getStatus()}</div>;
 *   }
 * });
 *
 * // Usage - no props needed
 * <StatusDisplay />
 * ```
 */
export function createComponent<
  const TRequires extends readonly Port<string, unknown>[],
  TProps extends object = Record<string, never>,
>(config: ComponentConfig<TRequires, TProps>): FC<TProps> {
  const { requires, render } = config;

  // Create the component function
  function Component(props: TProps): ReactNode {
    // Get resolver context - throws if outside provider
    const resolverContext = useContext(ResolverContext);

    if (resolverContext === null) {
      throw new MissingProviderError("createComponent", "ContainerProvider");
    }

    // Resolve all ports and build deps object
    const deps: Record<string, unknown> = {};
    for (const port of requires) {
      // Access port name via the __portName property (standard Port interface)
      const portName = port.__portName;
      deps[portName] = resolverContext.resolver.resolve(port);
    }

    // Call render with typed deps and props
    return render(deps as ComponentResolvedDeps<TupleToUnion<TRequires>>, props);
  }

  // Set display name for React DevTools
  Component.displayName = "DIComponent";

  return Component;
}
