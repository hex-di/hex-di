/**
 * Container configuration options and phase types.
 *
 * These types define the options for creating containers and the
 * initialization phase tracking for type-state enforcement.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type { Graph } from "@hex-di/graph";
import type { InheritanceModeConfig } from "./inheritance.js";
import type { ResolutionHooks } from "../resolution/hooks.js";

// =============================================================================
// Container Phase Type
// =============================================================================

/**
 * Represents the initialization phase of a container.
 *
 * Used for type-state tracking to enforce that async ports cannot be resolved
 * synchronously before initialization.
 *
 * @remarks
 * - `'uninitialized'`: Container has not been initialized; sync resolve limited to sync-only ports
 * - `'initialized'`: All async ports have been initialized; sync resolve works for all ports
 */
export type ContainerPhase = "uninitialized" | "initialized";

// =============================================================================
// Container Naming Types
// =============================================================================

/**
 * The kind of container in the hierarchy.
 *
 * - `'root'`: The root container created by `createContainer()`
 * - `'child'`: A child container created by `createChild()`
 */
export type ContainerKind = "root" | "child";

// =============================================================================
// DevTools Options
// =============================================================================

/**
 * DevTools-specific options for container visibility and display.
 *
 * These options control how the container appears in DevTools
 * without affecting runtime behavior.
 *
 * @example
 * ```typescript
 * const container = createContainer(graph, {
 *   name: "App",
 *   devtools: {
 *     discoverable: true,
 *     label: "Main Application Container",
 *   },
 * });
 * ```
 */
export interface ContainerDevToolsOptions {
  /**
   * Whether this container is discoverable by DevTools.
   *
   * When `false`, DevTools will not automatically discover or display
   * this container or its children. Useful for internal/infrastructure
   * containers that should not appear in the UI.
   *
   * @default true
   */
  readonly discoverable?: boolean;

  /**
   * Custom display label for DevTools.
   *
   * When provided, DevTools will use this label instead of the container name
   * for display purposes. The container name is still used for identification.
   *
   * @default undefined (uses container name)
   */
  readonly label?: string;
}

/**
 * Performance-related options for container runtime behavior.
 *
 * These options allow disabling certain features for production
 * builds where debugging information is not needed.
 *
 * @example
 * ```typescript
 * const container = createContainer(graph, {
 *   name: "App",
 *   performance: {
 *     disableTimestamps: process.env.NODE_ENV === "production",
 *   },
 * });
 * ```
 */
export interface RuntimePerformanceOptions {
  /**
   * Disable timestamp capture for production builds.
   *
   * When true, `resolvedAt` will be 0 and no Date.now() calls
   * will be made during resolution. This reduces overhead in
   * high-throughput scenarios.
   *
   * @default false
   */
  readonly disableTimestamps?: boolean;
}

/**
 * Options for creating a root container.
 *
 * @example
 * ```typescript
 * const root = createContainer({ graph: graph, name: "Root Container"  });
 * root.name       // "Root Container"
 * root.parentName // null
 * root.kind       // "root"
 * ```
 *
 * @example With DevTools options
 * ```typescript
 * const root = createContainer(graph, {
 *   name: "App",
 *   devtools: { label: "Main Application" },
 * });
 * ```
 */
export interface CreateContainerOptions {
  /** Container name - serves as both identifier and display label */
  readonly name: string;

  /** DevTools-specific options for visibility and display */
  readonly devtools?: ContainerDevToolsOptions;

  /** Performance-related options */
  readonly performance?: RuntimePerformanceOptions;
}

/**
 * Options for creating a child container.
 *
 * @example
 * ```typescript
 * const child = root.createChild(childGraph, { name: "Auth Feature" });
 * child.name       // "Auth Feature"
 * child.parentName // "Root Container" (derived from parent.name)
 * child.kind       // "child"
 * ```
 *
 * @example With inheritance modes
 * ```typescript
 * const child = root.createChild(childGraph, {
 *   name: "Forked Feature",
 *   inheritanceModes: { Logger: "forked" }
 * });
 * ```
 *
 * @example With DevTools options
 * ```typescript
 * const child = root.createChild(childGraph, {
 *   name: "Internal",
 *   devtools: { discoverable: false },
 * });
 * ```
 */
export interface CreateChildOptions<TProvides extends Port<unknown, string> = never> {
  /** Container name - serves as both identifier and display label */
  readonly name: string;

  /** Optional per-port inheritance mode configuration */
  readonly inheritanceModes?: InheritanceModeConfig<TProvides>;

  /** DevTools-specific options for visibility and display */
  readonly devtools?: ContainerDevToolsOptions;

  /** Performance-related options */
  readonly performance?: RuntimePerformanceOptions;
}

// =============================================================================
// Unified Container Configuration
// =============================================================================

/**
 * Unified configuration for creating a root container.
 *
 * This interface combines all container creation options into a single object
 * for a cleaner, more extensible API.
 *
 * @example Basic usage
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 * });
 * ```
 *
 * @example With hooks
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   hooks: {
 *     beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *     afterResolve: (ctx) => console.log(`Resolved in ${ctx.duration}ms`),
 *   },
 * });
 * ```
 *
 * @example With performance options
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   performance: { disableTimestamps: true },
 * });
 * ```
 */
export interface CreateContainerConfig<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  /** The validated ServiceGraph containing all adapters */
  readonly graph: Graph<TProvides, Port<unknown, string>>;

  /** Container name - serves as both identifier and display label */
  readonly name: string;

  /** Optional resolution lifecycle hooks */
  readonly hooks?: ResolutionHooks;

  /** DevTools-specific options for visibility and display */
  readonly devtools?: ContainerDevToolsOptions;

  /** Performance-related options */
  readonly performance?: RuntimePerformanceOptions;
}
