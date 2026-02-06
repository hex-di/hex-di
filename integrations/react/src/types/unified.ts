/**
 * Unified Provider Types for @hex-di/react.
 *
 * This module provides comprehensive type definitions for unified ContainerProvider
 * and AsyncContainerProvider components that support both container mode
 * (pre-created containers) and graph mode (child container creation).
 *
 * ## Key Features
 *
 * 1. **Discriminated Union Props**: TypeScript narrows based on container vs graph
 * 2. **Inheritance Mode Validation**: Compile-time validation of inheritance keys
 * 3. **Graph Mode Support**: Create child containers from React context
 * 4. **Nested Factory Pattern**: Create child-specific integrations
 *
 * @packageDocumentation
 */

import type { ReactNode, ComponentType } from "react";
import type { Port, InferService } from "@hex-di/core";
import type { Container, InheritanceMode } from "@hex-di/runtime";
import type { Graph, InferGraphProvides, InferGraphOverrides } from "@hex-di/graph";
import type { Resolver } from "./core.js";

// =============================================================================
// Port Name Extraction Utilities
// =============================================================================

/**
 * Extracts port names from a union of Port types.
 *
 * Uses distributive conditional types for union preservation.
 *
 * @typeParam T - Union of Port types
 * @returns Union of port name string literals
 *
 * @example
 * ```typescript
 * type Names = ExtractPortNames<typeof LoggerPort | typeof DbPort>;
 * // "Logger" | "Database"
 * ```
 */
export type ExtractPortNames<T> = T extends Port<infer _S, infer TName> ? TName : never;

// =============================================================================
// Inheritance Mode Validation Types
// =============================================================================

/**
 * Computes valid inheritance mode keys for a child container.
 *
 * Valid keys are:
 * - In parent's provides (TParentProvides)
 * - NOT in child's overrides (the child provides a replacement)
 *
 * @typeParam TParentProvides - Ports from parent container
 * @typeParam TOverrides - Ports overridden by child graph
 */
export type ValidInheritanceKeys<
  TParentProvides extends Port<unknown, string>,
  TOverrides extends Port<unknown, string> = never,
> = Exclude<ExtractPortNames<TParentProvides>, ExtractPortNames<TOverrides>>;

/**
 * Validated inheritance mode configuration.
 *
 * Keys are restricted to:
 * 1. Port names that exist in TParentProvides
 * 2. Port names that are NOT in TOverrides (overridden ports always get new instances)
 *
 * @typeParam TParentProvides - Ports provided by the parent container
 * @typeParam TOverrides - Ports that are overridden in the child graph
 *
 * @example
 * ```typescript
 * type ParentPorts = typeof LoggerPort | typeof DbPort;
 * type Overrides = typeof LoggerPort; // Logger is overridden
 *
 * type ValidConfig = ValidatedInheritanceModes<ParentPorts, Overrides>;
 * // { Database?: InheritanceMode }
 * // Logger is excluded because it's overridden
 * ```
 */
export type ValidatedInheritanceModes<
  TParentProvides extends Port<unknown, string>,
  TOverrides extends Port<unknown, string> = never,
> = {
  [K in ValidInheritanceKeys<TParentProvides, TOverrides>]?: InheritanceMode;
};

/**
 * Strict inheritance mode config with readonly modifier.
 *
 * Same as ValidatedInheritanceModes but with readonly properties.
 */
export type StrictInheritanceModeConfig<
  TParentProvides extends Port<unknown, string>,
  TOverrides extends Port<unknown, string> = never,
> = {
  readonly [K in ValidInheritanceKeys<TParentProvides, TOverrides>]?: InheritanceMode;
};

/**
 * Type-level error for invalid inheritance mode keys.
 *
 * When a user provides an invalid port name in inheritanceModes,
 * this error type provides actionable guidance.
 *
 * @typeParam TInvalidKey - The invalid key that was provided
 * @typeParam TValidKeys - The set of valid keys
 */
export type InvalidInheritanceModeKeyError<
  TInvalidKey extends string,
  TValidKeys extends string,
> = {
  readonly __errorBrand: "InvalidInheritanceModeKey";
  readonly __message: "Port name not found in parent container or is overridden";
  readonly __invalidKey: TInvalidKey;
  readonly __validKeys: TValidKeys;
  readonly __hint: "Only non-overridden ports from parent can have inheritance modes";
};

/**
 * Type-level assertion that inheritance mode keys are valid.
 *
 * Returns the config if valid, or an error type if invalid keys are present.
 */
export type ValidateInheritanceModeKeys<
  TConfig extends Record<string, InheritanceMode>,
  TValidKeys extends string,
> = keyof TConfig extends TValidKeys
  ? TConfig
  : InvalidInheritanceModeKeyError<Exclude<keyof TConfig & string, TValidKeys>, TValidKeys>;

// =============================================================================
// ContainerProvider Discriminated Union Props
// =============================================================================

/**
 * Props for ContainerProvider when using a pre-created container.
 *
 * This mode is used for:
 * - Root containers created with createContainer()
 * - Child containers created outside React with container.createChild()
 *
 * @typeParam TProvides - Ports provided by the container
 * @typeParam TExtends - Ports extended from parent (for child containers)
 */
export interface ContainerProviderContainerProps<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
> {
  /**
   * Pre-created container instance (root or child).
   */
  readonly container: Container<TProvides, TExtends>;

  /**
   * Graph is not allowed when using container mode.
   */
  readonly graph?: never;

  /**
   * Inheritance modes are not allowed when using container mode.
   * (Container's inheritance is already configured at creation time)
   */
  readonly inheritanceModes?: never;

  /**
   * React children
   */
  readonly children: ReactNode;
}

/**
 * Props for ContainerProvider when using graph-based child creation.
 *
 * This mode creates a child container from the graph, using the parent
 * container from React context. The parent must be provided by an ancestor
 * ContainerProvider.
 *
 * @typeParam TParentProvides - Ports provided by parent (from context)
 * @typeParam TGraph - The child graph type
 */
export interface ContainerProviderGraphProps<
  TParentProvides extends Port<unknown, string>,
  TGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
> {
  /**
   * Container is not allowed when using graph mode.
   */
  readonly container?: never;

  /**
   * Graph defining the child container's adapters.
   * Can include overrides and extensions.
   */
  readonly graph: TGraph;

  /**
   * Per-port inheritance mode configuration.
   *
   * Keys are validated at compile time to ensure they:
   * 1. Exist in the parent container's TProvides
   * 2. Are not overridden by the child graph
   *
   * Modes:
   * - 'shared': Child sees parent's singleton (default)
   * - 'forked': Child gets snapshot copy at creation
   * - 'isolated': Child creates fresh instance
   */
  readonly inheritanceModes?: StrictInheritanceModeConfig<
    TParentProvides,
    InferGraphOverrides<TGraph>
  >;

  /**
   * React children
   */
  readonly children: ReactNode;
}

// =============================================================================
// AsyncContainerProvider Discriminated Union Props
// =============================================================================

/**
 * Props for AsyncContainerProvider when using a pre-created uninitialized container.
 *
 * @typeParam TProvides - Ports provided by the container
 * @typeParam TAsyncPorts - Ports that require async initialization
 */
export interface AsyncContainerProviderContainerProps<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = Port<unknown, string>,
> {
  /**
   * Uninitialized container to initialize and provide.
   * Must be a root container (TExtends = never) since only root containers
   * have the initialize() method.
   */
  readonly container: Container<TProvides, never, TAsyncPorts, "uninitialized">;

  /**
   * Graph is not allowed when using container mode.
   */
  readonly graph?: never;

  /**
   * Inheritance modes are not allowed when using container mode.
   */
  readonly inheritanceModes?: never;

  /**
   * React children (can be compound components)
   */
  readonly children: ReactNode;

  /**
   * Optional loading fallback for simple mode.
   */
  readonly loadingFallback?: ReactNode;

  /**
   * Optional error fallback for simple mode.
   */
  readonly errorFallback?: (error: Error) => ReactNode;
}

/**
 * Props for AsyncContainerProvider when using graph-based child creation.
 *
 * Creates a child container from the graph using parent from context,
 * then handles async initialization of any async adapters in the child graph.
 *
 * @typeParam TParentProvides - Ports provided by parent (from context)
 * @typeParam TGraph - The child graph type
 */
export interface AsyncContainerProviderGraphProps<
  TParentProvides extends Port<unknown, string>,
  TGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
> {
  /**
   * Container is not allowed when using graph mode.
   */
  readonly container?: never;

  /**
   * Graph defining the child container's adapters.
   * Can include async adapters that require initialization.
   */
  readonly graph: TGraph;

  /**
   * Per-port inheritance mode configuration.
   * Same validation rules as ContainerProvider.
   */
  readonly inheritanceModes?: StrictInheritanceModeConfig<
    TParentProvides,
    InferGraphOverrides<TGraph>
  >;

  /**
   * React children (can be compound components)
   */
  readonly children: ReactNode;

  /**
   * Optional loading fallback for simple mode.
   */
  readonly loadingFallback?: ReactNode;

  /**
   * Optional error fallback for simple mode.
   */
  readonly errorFallback?: (error: Error) => ReactNode;
}

// =============================================================================
// Component Types for Factory
// =============================================================================

/**
 * ContainerProvider component with function overloads for dual-mode support.
 *
 * TProvides becomes TParentProvides when using graph mode.
 *
 * @typeParam TProvides - Ports captured by the factory
 */
export interface TypedContainerProviderComponent<TProvides extends Port<unknown, string>> {
  /**
   * Container mode - accepts a pre-created container.
   */
  <TExtends extends Port<unknown, string> = never>(
    props: ContainerProviderContainerProps<TProvides, TExtends>
  ): ReactNode;

  /**
   * Graph mode - creates child container from graph using parent from context.
   * TProvides is used as TParentProvides for inheritance validation.
   */
  <TGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>>(
    props: ContainerProviderGraphProps<TProvides, TGraph>
  ): ReactNode;
}

/**
 * AsyncContainerProvider component with dual-mode and compound components.
 *
 * @typeParam TProvides - Ports captured by the factory
 */
export interface TypedAsyncContainerProviderComponent<TProvides extends Port<unknown, string>> {
  /**
   * Container mode - accepts an uninitialized container.
   */
  <TAsyncPorts extends Port<unknown, string> = Port<unknown, string>>(
    props: AsyncContainerProviderContainerProps<TProvides, TAsyncPorts>
  ): ReactNode;

  /**
   * Graph mode - creates async child container from graph.
   */
  <TGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>>(
    props: AsyncContainerProviderGraphProps<TProvides, TGraph>
  ): ReactNode;

  /**
   * Compound component for loading state.
   */
  Loading: ComponentType<{ children: ReactNode }>;

  /**
   * Compound component for error state.
   */
  Error: ComponentType<{
    children: ReactNode | ((error: Error) => ReactNode);
  }>;

  /**
   * Compound component for ready state.
   */
  Ready: ComponentType<{ children: ReactNode }>;
}

// =============================================================================
// Nested Factory Pattern Types
// =============================================================================

/**
 * Child hooks factory for creating child-specific typed hooks.
 *
 * This is created via `parentHooks.createChildHooks(ChildGraph)` and provides
 * a ContainerProvider that has inheritanceModes typed against the parent's
 * TProvides with the child graph's overrides excluded.
 *
 * @typeParam TParentProvides - Parent container's ports
 * @typeParam TChildGraph - The child graph type
 */
export interface ChildTypedReactIntegration<
  TParentProvides extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
> {
  /**
   * ContainerProvider pre-configured for this child graph.
   *
   * When using graph mode, inheritanceModes is typed against TParentProvides
   * with TChildGraph's overrides excluded.
   */
  readonly ContainerProvider: ChildContainerProviderComponent<TParentProvides, TChildGraph>;

  /**
   * AsyncContainerProvider pre-configured for this child graph.
   */
  readonly AsyncContainerProvider: ChildAsyncContainerProviderComponent<
    TParentProvides,
    TChildGraph
  >;

  /**
   * usePort typed for effective provides (parent + child extensions).
   */
  readonly usePort: <
    P extends
      | TParentProvides
      | Exclude<InferGraphProvides<TChildGraph>, InferGraphOverrides<TChildGraph>>,
  >(
    port: P
  ) => InferService<P>;

  /**
   * The child graph instance (captured for convenience).
   */
  readonly graph: TChildGraph;

  /**
   * Effective provides: parent + child extensions.
   */
  readonly __effectiveProvides: TParentProvides | InferGraphProvides<TChildGraph>;
}

/**
 * ContainerProvider for a specific child graph.
 *
 * The graph prop is pre-populated, and inheritanceModes is typed against
 * the parent's TProvides with the graph's overrides excluded.
 */
export interface ChildContainerProviderComponent<
  TParentProvides extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
> {
  (props: {
    /**
     * Inheritance modes typed against parent's ports minus overrides.
     */
    readonly inheritanceModes?: StrictInheritanceModeConfig<
      TParentProvides,
      InferGraphOverrides<TChildGraph>
    >;
    readonly children: ReactNode;
  }): ReactNode;
}

/**
 * AsyncContainerProvider for a specific child graph.
 */
export interface ChildAsyncContainerProviderComponent<
  TParentProvides extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
> {
  (props: {
    readonly inheritanceModes?: StrictInheritanceModeConfig<
      TParentProvides,
      InferGraphOverrides<TChildGraph>
    >;
    readonly children: ReactNode;
    readonly loadingFallback?: ReactNode;
    readonly errorFallback?: (error: Error) => ReactNode;
  }): ReactNode;

  Loading: ComponentType<{ children: ReactNode }>;
  Error: ComponentType<{ children: ReactNode | ((error: Error) => ReactNode) }>;
  Ready: ComponentType<{ children: ReactNode }>;
}

// =============================================================================
// Extended TypedReactIntegration with Nested Factory
// =============================================================================

/**
 * Extended factory return type that includes createChildHooks.
 *
 * This extends the base TypedReactIntegration with the ability to create
 * child-specific hooks that have proper type relationships with the parent.
 *
 * @typeParam TProvides - Ports captured by this factory instance
 */
export interface ExtendedTypedReactIntegration<TProvides extends Port<unknown, string>> {
  /**
   * ContainerProvider with dual-mode support.
   */
  readonly ContainerProvider: TypedContainerProviderComponent<TProvides>;

  /**
   * ScopeProvider for manual scope management.
   */
  readonly ScopeProvider: (props: {
    readonly scope: Resolver<TProvides>;
    readonly children: ReactNode;
  }) => ReactNode;

  /**
   * AutoScopeProvider for automatic scope lifecycle.
   */
  readonly AutoScopeProvider: (props: { readonly children: ReactNode }) => ReactNode;

  /**
   * AsyncContainerProvider with dual-mode and compound components.
   */
  readonly AsyncContainerProvider: TypedAsyncContainerProviderComponent<TProvides>;

  /**
   * Type-safe port resolution hook.
   */
  readonly usePort: <P extends TProvides>(port: P) => InferService<P>;

  /**
   * Optional port resolution (returns undefined on failure).
   */
  readonly usePortOptional: <P extends TProvides>(port: P) => InferService<P> | undefined;

  /**
   * Access the nearest container.
   */
  readonly useContainer: () => Resolver<TProvides>;

  /**
   * Create and manage a scope tied to component lifecycle.
   */
  readonly useScope: () => Resolver<TProvides>;

  /**
   * Creates child-specific hooks with inheritance modes typed against this
   * factory's TProvides.
   *
   * @typeParam TChildGraph - The child graph type
   * @param childGraph - The compiled child graph
   * @returns A ChildTypedReactIntegration bound to both parent and child types
   *
   * @example
   * ```typescript
   * // Parent factory
   * const AppDI = createTypedHooks<AppPorts>();
   *
   * // Child factory with proper parent relationship
   * const PluginDI = AppDI.createChildHooks(PluginGraph);
   *
   * // Usage
   * <AppDI.ContainerProvider container={rootContainer}>
   *   <PluginDI.ContainerProvider
   *     inheritanceModes={{ Logger: "shared" }}  // Typed against AppPorts
   *   >
   *     <PluginComponent />
   *   </PluginDI.ContainerProvider>
   * </AppDI.ContainerProvider>
   * ```
   */
  createChildHooks<
    TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
  >(
    childGraph: TChildGraph
  ): ChildTypedReactIntegration<TProvides, TChildGraph>;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Runtime props union for type guards.
 */
type RuntimeProviderProps<TProvides extends Port<unknown, string>> =
  | ContainerProviderContainerProps<TProvides>
  | ContainerProviderGraphProps<
      TProvides,
      Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>
    >;

/**
 * Type guard to check if props are container mode.
 */
export function isContainerMode<TProvides extends Port<unknown, string>>(
  props: RuntimeProviderProps<TProvides>
): props is ContainerProviderContainerProps<TProvides> {
  return "container" in props && props.container !== undefined;
}

/**
 * Type guard to check if props are graph mode.
 */
export function isGraphMode<
  TParentProvides extends Port<unknown, string>,
  TGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  props: RuntimeProviderProps<TParentProvides>
): props is ContainerProviderGraphProps<TParentProvides, TGraph> {
  return "graph" in props && props.graph !== undefined;
}
