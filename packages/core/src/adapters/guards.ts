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

  return true;
}
