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
      // Skip copying the plugin's own symbol - we'll define it ourselves with a fresh API
      // This prevents "Cannot redefine property" errors when the input already has this symbol
      if (key === plugin.symbol) {
        continue;
      }

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
        } else if (key === "createChild" && typeof descriptor.value === "function") {
          // Intercept createChild to auto-apply parent wrappers to child containers.
          // When wrappers are chained via pipe(), each wrapper intercepts createChild.
          // To avoid applying wrappers multiple times, we:
          // 1. Store the original base createChild (from the first wrapper application)
          // 2. Always call the base createChild, not the intercepted chain
          // 3. Apply the CURRENT enhanced object's accumulated wrappers
          const currentCreateChild = descriptor.value as (
            ...args: unknown[]
          ) => EnhanceableContainer;

          // Get or store the base createChild
          // If container already has a base stored, use that; otherwise this IS the base
          const baseCreateChild = baseCreateChildMap.get(container) ?? currentCreateChild;
          // Store the base for this enhanced object so subsequent wrappers can find it
          baseCreateChildMap.set(enhanced, baseCreateChild);

          Object.defineProperty(enhanced, key, {
            ...descriptor,
            value: function (this: unknown, ...args: unknown[]) {
              // Always call the BASE createChild to get raw child without any wrapper effects
              const rawChild = baseCreateChild.apply(container, args);
              // Apply THIS enhanced object's accumulated wrappers
              return applyParentWrappers(
                enhanced as EnhanceableContainer & WrapperTracking,
                rawChild
              );
            },
          });
        } else if (key === "createChildAsync" && typeof descriptor.value === "function") {
          // Same logic for async version
          const currentCreateChildAsync = descriptor.value as (
            ...args: unknown[]
          ) => Promise<EnhanceableContainer>;

          const baseCreateChildAsync =
            baseCreateChildAsyncMap.get(container) ?? currentCreateChildAsync;
          baseCreateChildAsyncMap.set(enhanced, baseCreateChildAsync);

          Object.defineProperty(enhanced, key, {
            ...descriptor,
            value: function (this: unknown, ...args: unknown[]) {
              const childPromise = baseCreateChildAsync.apply(container, args);
              return childPromise.then(rawChild =>
                applyParentWrappers(enhanced as EnhanceableContainer & WrapperTracking, rawChild)
              );
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

    // Get inherited wrappers from input container before tracking
    // This enables wrapper accumulation when using pipe() with multiple wrappers
    const inheritedWrappers = getAppliedWrappers(container);

    // Track applied wrapper for child inheritance, including inherited wrappers
    trackAppliedWrapper(
      enhanced,
      plugin,
      wrapper as unknown as PluginWrapperFn<symbol, unknown>,
      inheritedWrappers
    );

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
 *
 * When wrappers are chained via `pipe()`, each new enhanced object must
 * accumulate ALL previous wrappers, not just track its own. The `inheritedWrappers`
 * parameter enables this by passing wrappers from the input container.
 *
 * @internal
 */
function trackAppliedWrapper(
  container: EnhanceableContainer,
  plugin: AnyPlugin,
  wrapper: PluginWrapperFn<symbol, unknown>,
  inheritedWrappers: readonly AppliedWrapper[] = []
): void {
  // Merge inherited wrappers (from input container) with the new wrapper
  const newWrappers = [...inheritedWrappers, { plugin, wrapper }];
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
 * WeakMap to track original-to-enhanced wrapper relationships.
 *
 * When `applyParentWrappers()` enhances a child container, the parent's
 * `childContainers` array still references the original (raw) wrapper.
 * This map enables `getChildContainers()` to discover the enhanced wrapper
 * (with plugin APIs like INSPECTOR) from the original wrapper.
 *
 * @internal
 */
const originalToEnhancedMap = new WeakMap<EnhanceableContainer, EnhanceableContainer>();

/**
 * WeakMap to store the original (non-intercepted) createChild function.
 *
 * When wrappers are chained via pipe(), each wrapper intercepts createChild.
 * To avoid applying wrappers multiple times (once per wrapper in the chain),
 * we store the original base createChild and always use that instead of
 * calling through the intercepted chain.
 *
 * @internal
 */
const baseCreateChildMap = new WeakMap<
  EnhanceableContainer,
  (...args: unknown[]) => EnhanceableContainer
>();

/**
 * WeakMap to store the original (non-intercepted) createChildAsync function.
 * @internal
 */
const baseCreateChildAsyncMap = new WeakMap<
  EnhanceableContainer,
  (...args: unknown[]) => Promise<EnhanceableContainer>
>();

/**
 * Gets the enhanced wrapper for an original (raw) wrapper.
 *
 * Returns the enhanced wrapper if the original was enhanced via
 * `applyParentWrappers()`, otherwise returns the original wrapper.
 *
 * @internal
 */
export function getEnhancedWrapper<C extends EnhanceableContainer>(original: C): C {
  const enhanced = originalToEnhancedMap.get(original);
  return (enhanced ?? original) as C;
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

  // Track original→enhanced relationship for getChildContainers() discovery.
  // The parent's childContainers array stores the original (raw) wrapper,
  // but getChildContainers() needs to find the enhanced wrapper (with INSPECTOR).
  originalToEnhancedMap.set(childContainer, enhanced);

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
