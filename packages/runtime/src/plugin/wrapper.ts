/**
 * Plugin wrapper utilities for @hex-di/runtime.
 *
 * Provides enhancement wrapper functions that augment containers with plugin APIs.
 * Uses `Object.assign` for type-safe intersection types without casts.
 *
 * Inspired by:
 * - Redux DevTools enhancer pattern
 * - Zustand middleware composition
 * - Neovim plugin extensions
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { Container, ContainerPhase, Scope } from "../types.js";
import type { Plugin, PluginDependency, PluginContext, AnyPlugin } from "./types.js";
import type { InternalAccessible } from "../inspector/types.js";
import type { HooksInstaller } from "../resolution/hooks.js";
import { INTERNAL_ACCESS, HOOKS_ACCESS } from "../inspector/symbols.js";

// =============================================================================
// Base Container Types for Wrapper Constraints
// =============================================================================

/**
 * Minimal container interface that plugin wrappers can enhance.
 *
 * This is the constraint for wrapper function generic parameters.
 * Any container-like object that has these properties can be enhanced.
 */
export interface EnhanceableContainer {
  readonly [INTERNAL_ACCESS]: () => { readonly containerId: string };
  /** Optional hook installer for wrappers to install plugin hooks */
  readonly [HOOKS_ACCESS]?: () => HooksInstaller;
}

/**
 * Symbol for tracking applied plugin wrappers.
 *
 * Used internally to track which plugins have been applied to a container,
 * enabling child containers to inherit plugin enhancements.
 *
 * @internal
 */
export const APPLIED_WRAPPERS: unique symbol = Symbol("hex-di.appliedWrappers");

/**
 * Internal type for container with wrapper tracking.
 * @internal
 */
export interface WrapperTracking {
  readonly [APPLIED_WRAPPERS]?: readonly AppliedWrapper[];
}

/**
 * Tracks an applied wrapper for child inheritance.
 * @internal
 */
export interface AppliedWrapper {
  readonly plugin: AnyPlugin;
  readonly wrapper: PluginWrapperFn<symbol, unknown>;
}

// =============================================================================
// Plugin Wrapper Type
// =============================================================================

/**
 * A plugin wrapper function that enhances a container with a plugin API.
 *
 * The wrapper uses generics to preserve the input container type while
 * adding the plugin's symbol-keyed API to the result type.
 *
 * @typeParam TSymbol - The unique symbol for the plugin API
 * @typeParam TApi - The API interface the plugin provides
 *
 * @example
 * ```typescript
 * const withInspector: PluginWrapper<typeof INSPECTOR, InspectorAPI> = (container) => {
 *   const api = createInspectorApi(container);
 *   return Object.assign(container, { [INSPECTOR]: api });
 * };
 *
 * const enhanced = withInspector(container);
 * enhanced[INSPECTOR].getSnapshot();  // TypeScript knows the type!
 * ```
 */
export type PluginWrapper<TSymbol extends symbol, TApi> = <C extends EnhanceableContainer>(
  container: C
) => C & { readonly [K in TSymbol]: TApi };

/**
 * Internal wrapper function type for runtime use.
 * @internal
 */
export type PluginWrapperFn<TSymbol extends symbol, TApi> = (
  container: EnhanceableContainer
) => EnhanceableContainer & { readonly [K in TSymbol]: TApi };

// =============================================================================
// Wrapper Context (Simplified Plugin Context for Wrappers)
// =============================================================================

/**
 * Context provided to wrapper functions during enhancement.
 *
 * A simplified version of PluginContext that provides access to
 * the container being enhanced.
 */
export interface WrapperContext {
  /** The container being enhanced */
  readonly container: InternalAccessible;
  /** Container ID for event routing */
  readonly containerId: string;
  /** Register a disposal callback */
  onDispose(callback: () => void | Promise<void>): void;
}

/**
 * Registry of disposal callbacks per container.
 * @internal
 */
const disposalCallbacks = new WeakMap<EnhanceableContainer, Array<() => void | Promise<void>>>();

/**
 * Gets the disposal callbacks for a container.
 * @internal
 */
export function getDisposalCallbacks(
  container: EnhanceableContainer
): Array<() => void | Promise<void>> {
  let callbacks = disposalCallbacks.get(container);
  if (callbacks === undefined) {
    callbacks = [];
    disposalCallbacks.set(container, callbacks);
  }
  return callbacks;
}

// =============================================================================
// Wrapper Factory
// =============================================================================

/**
 * Creates a plugin wrapper function from a plugin definition.
 *
 * The wrapper uses `Object.assign` which TypeScript correctly types
 * as an intersection - no type casts needed!
 *
 * @typeParam TSymbol - The unique symbol for the plugin API (inferred)
 * @typeParam TApi - The API interface the plugin provides (inferred)
 * @param plugin - The plugin to create a wrapper for
 * @returns A wrapper function that enhances containers with the plugin
 *
 * @example
 * ```typescript
 * const withInspector = createPluginWrapper(InspectorPlugin);
 *
 * const container = createContainer(graph);
 * const enhanced = withInspector(container);
 *
 * // TypeScript knows enhanced has [INSPECTOR]: InspectorAPI
 * enhanced[INSPECTOR].getSnapshot();
 * ```
 */
export function createPluginWrapper<
  TSymbol extends symbol,
  TApi,
  TRequired extends readonly PluginDependency<symbol, unknown, false>[] = readonly [],
  TOptional extends readonly PluginDependency<symbol, unknown, true>[] = readonly [],
>(plugin: Plugin<TSymbol, TApi, TRequired, TOptional>): PluginWrapper<TSymbol, TApi> {
  // Create the wrapper function
  const wrapper = <C extends EnhanceableContainer>(
    container: C
  ): C & { readonly [K in TSymbol]: TApi } => {
    const internalAccessor = container[INTERNAL_ACCESS];
    const { containerId } = internalAccessor();

    // Create context for the plugin
    const callbacks = getDisposalCallbacks(container);
    const context: WrapperContext = {
      container: container as unknown as InternalAccessible,
      containerId,
      onDispose(callback) {
        callbacks.push(callback);
      },
    };

    // Create the plugin API
    // Note: We pass a minimal context. Plugins using wrapper pattern
    // should use WrapperContext, not full PluginContext with dependencies.
    const api = createApiFromWrapper(plugin, context);

    // Install plugin hooks if the plugin defines them and container supports it
    const hooksAccessor = container[HOOKS_ACCESS];
    if (hooksAccessor !== undefined && plugin.hooks !== undefined) {
      const installer = hooksAccessor();
      const uninstallHooks = installer.installHooks(plugin.hooks);
      // Register uninstall function for disposal
      callbacks.push(uninstallHooks);
    }

    // Create a new object that copies all container properties and adds the plugin API.
    // We can't use Proxy because containers are frozen (non-extensible), and Proxy
    // has strict invariants that prevent adding virtual properties to non-extensible targets.
    //
    // Instead, we create a fresh object with all original properties plus the plugin API.
    // This allows chaining multiple wrappers via pipe().
    const enhanced = Object.create(null);

    // Copy all properties from the original container (including symbols)
    for (const key of Reflect.ownKeys(container)) {
      const descriptor = Object.getOwnPropertyDescriptor(container, key);
      if (descriptor !== undefined) {
        // For the dispose method, wrap it to run plugin disposal callbacks
        if (key === "dispose" && typeof descriptor.value === "function") {
          const originalDispose = descriptor.value as () => Promise<void>;
          Object.defineProperty(enhanced, key, {
            ...descriptor,
            value: async function (this: unknown) {
              // Run plugin disposal callbacks in reverse order (LIFO)
              const pluginCallbacks = getDisposalCallbacks(container);
              for (let i = pluginCallbacks.length - 1; i >= 0; i--) {
                await pluginCallbacks[i]();
              }
              // Then call the original dispose
              return originalDispose.call(container);
            },
          });
        } else {
          Object.defineProperty(enhanced, key, descriptor);
        }
      }
    }

    // Add the plugin API
    Object.defineProperty(enhanced, plugin.symbol, {
      value: api,
      enumerable: true,
      configurable: false,
      writable: false,
    });

    // Track applied wrapper for child inheritance
    trackAppliedWrapper(enhanced, plugin, wrapper as unknown as PluginWrapperFn<symbol, unknown>);

    // Freeze the enhanced object for immutability
    Object.freeze(enhanced);

    // SAFETY: This assertion is valid because we've copied all properties from C
    // and added the plugin.symbol property with the api value.
    return enhanced as C & { readonly [K in TSymbol]: TApi };
  };

  return wrapper;
}

/**
 * Creates the plugin API from wrapper context.
 * @internal
 */
function createApiFromWrapper<
  TSymbol extends symbol,
  TApi,
  TRequired extends readonly PluginDependency<symbol, unknown, false>[],
  TOptional extends readonly PluginDependency<symbol, unknown, true>[],
>(plugin: Plugin<TSymbol, TApi, TRequired, TOptional>, context: WrapperContext): TApi {
  // Create a minimal PluginContext compatible interface
  const pluginContext: PluginContext<TRequired, TOptional> = {
    getDependency(_symbol) {
      throw new Error(
        `Plugin "${plugin.name}" uses wrapper pattern. ` +
          `Dependencies should be accessed via separate wrappers, not getDependency().`
      );
    },
    getOptionalDependency(_symbol) {
      return undefined;
    },
    hasPlugin(_symbol) {
      // Check if symbol exists on container
      return _symbol in context.container;
    },
    scopeEvents: {
      onScopeCreated: () => () => {},
      onScopeDisposing: () => () => {},
      onScopeDisposed: () => () => {},
    },
    onDispose: context.onDispose,
    getContainer: () => context.container,
  } as PluginContext<TRequired, TOptional>;

  const api = plugin.createApi(pluginContext);
  return Object.freeze(api) as TApi;
}

/**
 * WeakMap to track applied wrappers externally.
 * This is necessary because containers are frozen and can't have properties added.
 * @internal
 */
const wrapperTrackingMap = new WeakMap<EnhanceableContainer, readonly AppliedWrapper[]>();

/**
 * Tracks an applied wrapper on a container for child inheritance.
 * Uses WeakMap to store tracking data externally since containers are frozen.
 * @internal
 */
function trackAppliedWrapper(
  container: EnhanceableContainer,
  plugin: AnyPlugin,
  wrapper: PluginWrapperFn<symbol, unknown>
): void {
  const existingWrappers = wrapperTrackingMap.get(container) ?? [];
  const newWrappers = [...existingWrappers, { plugin, wrapper }];
  wrapperTrackingMap.set(container, Object.freeze(newWrappers));
}

/**
 * Gets applied wrappers from a container.
 * @internal
 */
export function getAppliedWrappers(container: EnhanceableContainer): readonly AppliedWrapper[] {
  return wrapperTrackingMap.get(container) ?? [];
}

/**
 * Applies parent wrappers to a child container.
 *
 * Called by child container creation to inherit plugin enhancements.
 *
 * @param parentContainer - The parent container with applied wrappers
 * @param childContainer - The child container to enhance
 * @returns The enhanced child container
 *
 * @internal
 */
export function applyParentWrappers<C extends EnhanceableContainer>(
  parentContainer: EnhanceableContainer & WrapperTracking,
  childContainer: C
): C {
  const wrappers = getAppliedWrappers(parentContainer);

  if (wrappers.length === 0) {
    return childContainer;
  }

  // Apply each wrapper in order
  let enhanced: EnhanceableContainer = childContainer;
  for (const { wrapper } of wrappers) {
    enhanced = wrapper(enhanced);
  }

  return enhanced as C;
}

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Extracts the enhanced type from applying a wrapper to a container.
 *
 * @typeParam C - The base container type
 * @typeParam TSymbol - The plugin symbol
 * @typeParam TApi - The plugin API type
 *
 * @example
 * ```typescript
 * type Enhanced = WithPlugin<Container<MyPorts>, typeof INSPECTOR, InspectorAPI>;
 * // Container<MyPorts> & { readonly [INSPECTOR]: InspectorAPI }
 * ```
 */
export type WithPlugin<C, TSymbol extends symbol, TApi> = C & { readonly [K in TSymbol]: TApi };

/**
 * Extracts the result type of a plugin wrapper applied to a container.
 *
 * @typeParam W - The wrapper function type
 * @typeParam C - The container type
 */
export type ApplyWrapper<W extends PluginWrapper<symbol, unknown>, C extends EnhanceableContainer> =
  W extends PluginWrapper<infer S, infer A> ? C & { readonly [K in S]: A } : never;
