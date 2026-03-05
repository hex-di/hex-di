/**
 * Handle-based resolution — integrates AdapterHandle lifecycle into the resolution pipeline.
 *
 * Provides `resolveHandle()` which wraps a service factory function with the
 * AdapterHandle lifecycle state machine: created -> initialized -> active.
 *
 * This is used by the container internally when handle-based resolution is desired,
 * and can also be used directly for fine-grained lifecycle control.
 *
 * Implements: BEH-CO-08-001 (container integration)
 *
 * @packageDocumentation
 * @internal
 */

import type { AdapterHandle, AdapterHandleConfig } from "@hex-di/core";
import { createAdapterHandle } from "@hex-di/core";

// =============================================================================
// resolveHandle
// =============================================================================

/**
 * Creates an `AdapterHandle<T, "created">` from a service factory.
 *
 * The handle wraps the factory into the lifecycle state machine.
 * The caller (container) is responsible for transitioning the handle through:
 *   `created` -> `initialized` -> `active`
 *
 * @typeParam T - The service type
 * @param getService - Function that produces the service instance (called during activation)
 * @param onDispose - Optional cleanup function (called during disposal)
 * @param onInitialize - Optional initialization function (called during initialize)
 * @returns A handle in the `"created"` state
 *
 * @example
 * ```ts
 * const handle = resolveHandle(() => adapter.factory(deps));
 * const initialized = await handle.initialize();
 * const active = initialized.activate();
 * const service = active.service;
 * ```
 *
 * @internal
 */
export function resolveHandle<T>(
  getService: () => T,
  onDispose?: () => Promise<void>,
  onInitialize?: () => Promise<void>
): AdapterHandle<T, "created"> {
  const config: AdapterHandleConfig<T> = {
    getService,
    onDispose,
    onInitialize,
  };

  return createAdapterHandle(config);
}

// =============================================================================
// resolveHandleToActive
// =============================================================================

/**
 * Convenience: creates a handle and immediately transitions it to `"active"`.
 *
 * This is the common path for the container resolution pipeline where
 * initialization is synchronous (no async setup needed) and the service
 * should be immediately available.
 *
 * @typeParam T - The service type
 * @param getService - Function that produces the service instance
 * @param onDispose - Optional cleanup function
 * @returns A handle in the `"active"` state with the service accessible
 *
 * @internal
 */
export async function resolveHandleToActive<T>(
  getService: () => T,
  onDispose?: () => Promise<void>
): Promise<AdapterHandle<T, "active">> {
  const created = resolveHandle(getService, onDispose);
  const initialized = await created.initialize();
  return initialized.activate();
}
