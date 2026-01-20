/**
 * Runtime Type Guards for @hex-di/graph
 *
 * These type guards provide runtime validation of graph types, complementing
 * the compile-time validation provided by the type system.
 *
 * ## Use Cases
 *
 * - **API Boundaries**: Validate inputs from external sources (JSON, user input)
 * - **Plugin Systems**: Verify adapter conformance at registration time
 * - **Debugging**: Narrow types in debugging scenarios
 * - **Migration**: Gradual migration from untyped to typed code
 *
 * @packageDocumentation
 */

import type { AdapterAny, FactoryKind, Lifetime } from "./adapter/types.js";
import type { Graph } from "./graph/types.js";
import { GraphBuilder } from "./graph/builder.js";

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
 *
 * Ports are objects with a `__portName` property that identifies them.
 *
 * @param value - The value to check
 * @returns `true` if the value has the Port structure
 *
 * @internal
 */
function isPort(value: unknown): value is { __portName: string } {
  if (value === null || typeof value !== "object") return false;
  return "__portName" in value && typeof (value as Record<string, unknown>).__portName === "string";
}

/**
 * Checks if a value conforms to the AdapterAny structure.
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
 * @returns `true` if the value conforms to AdapterAny
 *
 * @example
 * ```typescript
 * function registerAdapter(maybeAdapter: unknown) {
 *   if (!isAdapter(maybeAdapter)) {
 *     throw new Error('Invalid adapter structure');
 *   }
 *   // maybeAdapter is narrowed to AdapterAny
 *   builder.provide(maybeAdapter);
 * }
 * ```
 */
export function isAdapter(value: unknown): value is AdapterAny {
  if (value === null || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;

  // Check provides property
  if (!("provides" in obj) || !isPort(obj.provides)) return false;

  // Check requires property
  if (!("requires" in obj) || !Array.isArray(obj.requires)) return false;
  for (const req of obj.requires) {
    if (!isPort(req)) return false;
  }

  // Check lifetime property
  if (!("lifetime" in obj) || !isLifetime(obj.lifetime)) return false;

  // Check factoryKind property
  if (!("factoryKind" in obj) || !isFactoryKind(obj.factoryKind)) return false;

  // Check factory property
  if (!("factory" in obj) || typeof obj.factory !== "function") return false;

  // Check clonable property
  if (!("clonable" in obj) || typeof obj.clonable !== "boolean") return false;

  return true;
}

/**
 * Checks if a value is a GraphBuilder instance.
 *
 * Uses instanceof for accurate class detection rather than structural checking.
 *
 * @param value - The value to check
 * @returns `true` if the value is a GraphBuilder instance
 *
 * @example
 * ```typescript
 * function process(builderOrGraph: unknown) {
 *   if (isGraphBuilder(builderOrGraph)) {
 *     // builderOrGraph is narrowed to GraphBuilder
 *     return builderOrGraph.build();
 *   }
 * }
 * ```
 */
export function isGraphBuilder(value: unknown): value is GraphBuilder {
  return value instanceof GraphBuilder;
}

/**
 * Checks if a value conforms to the Graph structure.
 *
 * A Graph is a plain object with:
 * - `adapters`: Array of adapter objects
 * - `overridePortNames`: Set of port name strings
 *
 * @param value - The value to check
 * @returns `true` if the value conforms to Graph structure
 *
 * @example
 * ```typescript
 * function loadGraph(data: unknown): Graph {
 *   if (!isGraph(data)) {
 *     throw new Error('Invalid graph structure');
 *   }
 *   return data;
 * }
 * ```
 */
export function isGraph(value: unknown): value is Graph {
  if (value === null || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;

  // Check adapters property
  if (!("adapters" in obj) || !Array.isArray(obj.adapters)) return false;

  // Verify each adapter (shallow check - full validation would use isAdapter)
  for (const adapter of obj.adapters) {
    if (adapter === null || typeof adapter !== "object") return false;
    if (!("provides" in adapter) || !("requires" in adapter)) return false;
  }

  // Check overridePortNames property
  if (!("overridePortNames" in obj) || !(obj.overridePortNames instanceof Set)) return false;

  return true;
}
