/**
 * Runtime Type Guards for Adapters
 *
 * These type guards provide runtime validation of adapter types, complementing
 * the compile-time validation provided by the type system.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, FactoryKind, Lifetime } from "./types.js";

// =============================================================================
// Primitive Type Guards
// =============================================================================

/**
 * Checks if a value is a valid Lifetime value.
 *
 * @param value - The value to check
 * @returns `true` if the value is "singleton", "scoped", or "transient"
 *
 * @example
 * ```typescript
 * const config = JSON.parse(input);
 * if (isLifetime(config.lifetime)) {
 *   // config.lifetime is narrowed to Lifetime
 * }
 * ```
 */
export function isLifetime(value: unknown): value is Lifetime {
  return value === "singleton" || value === "scoped" || value === "transient";
}

/**
 * Checks if a value is a valid FactoryKind value.
 *
 * @param value - The value to check
 * @returns `true` if the value is "sync" or "async"
 *
 * @example
 * ```typescript
 * if (isFactoryKind(adapter.factoryKind)) {
 *   // Narrowed to "sync" | "async"
 * }
 * ```
 */
export function isFactoryKind(value: unknown): value is FactoryKind {
  return value === "sync" || value === "async";
}

// =============================================================================
// Complex Type Guards
// =============================================================================

/**
 * Checks if a value is a Port object.
 * @internal
 */
function isPort(value: unknown): value is { __portName: string } {
  if (value === null || typeof value !== "object") return false;
  return "__portName" in value && typeof value.__portName === "string";
}

/**
 * Checks if a value conforms to the AdapterConstraint structure.
 *
 * This guard verifies that an object has all the required properties
 * of an Adapter with appropriate types.
 *
 * ## Checked Properties
 *
 * - `provides`: Must be a Port object (has `__portName`)
 * - `requires`: Must be an array of Port objects
 * - `lifetime`: Must be a valid Lifetime value
 * - `factoryKind`: Must be a valid FactoryKind value
 * - `factory`: Must be a function
 * - `clonable`: Must be a boolean
 * - `freeze`: Must be a boolean
 *
 * @param value - The value to check
 * @returns `true` if the value conforms to AdapterConstraint
 *
 * @example
 * ```typescript
 * function registerAdapter(maybeAdapter: unknown) {
 *   if (!isAdapter(maybeAdapter)) {
 *     throw new Error('Invalid adapter structure');
 *   }
 *   // maybeAdapter is narrowed to AdapterConstraint
 *   builder.provide(maybeAdapter);
 * }
 * ```
 */
export function isAdapter(value: unknown): value is AdapterConstraint {
  if (value === null || typeof value !== "object") return false;

  // Check provides property
  if (!("provides" in value) || !isPort(value.provides)) return false;

  // Check requires property
  if (!("requires" in value) || !Array.isArray(value.requires)) return false;
  for (const req of value.requires) {
    if (!isPort(req)) return false;
  }

  // Check lifetime property
  if (!("lifetime" in value) || !isLifetime(value.lifetime)) return false;

  // Check factoryKind property
  if (!("factoryKind" in value) || !isFactoryKind(value.factoryKind)) return false;

  // Check factory property
  if (!("factory" in value) || typeof value.factory !== "function") return false;

  // Check clonable property
  if (!("clonable" in value) || typeof value.clonable !== "boolean") return false;

  // Check freeze property
  if (!("freeze" in value) || typeof value.freeze !== "boolean") return false;

  return true;
}

// =============================================================================
// Freeze Configuration Accessor
// =============================================================================

/**
 * Gets the freeze configuration from an adapter.
 *
 * Returns the adapter's `freeze` property value, which controls whether
 * resolved service instances are `Object.freeze()`d before injection.
 *
 * @param adapter - The adapter to read freeze config from
 * @returns `true` if the adapter's services should be frozen (default), `false` if they should be mutable
 *
 * @example
 * ```typescript
 * const adapter = createAdapter({
 *   provides: CachePort,
 *   factory: () => new Map(),
 *   freeze: false,
 * });
 *
 * getAdapterFreezeConfig(adapter); // false
 * ```
 */
export function getAdapterFreezeConfig(adapter: AdapterConstraint): boolean {
  return adapter.freeze;
}

// =============================================================================
// Freeze Verification Guards
// =============================================================================

/**
 * Checks if an adapter is frozen (integrity verified).
 *
 * Adapters created via `createAdapter()` are always frozen. An unfrozen
 * adapter indicates manual construction that bypassed validation.
 *
 * @param adapter - The adapter to check
 * @returns `true` if the adapter is frozen
 */
export function isAdapterFrozen(adapter: AdapterConstraint): boolean {
  return Object.isFrozen(adapter);
}

/**
 * Asserts that an adapter is frozen, throwing if not.
 *
 * Call this at consumption boundaries (e.g., graph builder, container)
 * to ensure adapters have not been tampered with.
 *
 * @param adapter - The adapter to verify
 * @throws {TypeError} If the adapter is not frozen
 */
export function assertAdapterFrozen(adapter: AdapterConstraint): void {
  if (!Object.isFrozen(adapter)) {
    throw new TypeError(
      `ERROR[HEX027]: Adapter for port '${adapter.provides.__portName}' is not frozen. ` +
        `Adapters must be created via createAdapter() which freezes them. ` +
        `Manually constructed adapters are not allowed for GxP compliance.`
    );
  }
}
