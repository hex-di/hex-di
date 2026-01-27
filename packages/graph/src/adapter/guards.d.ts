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
import type { AdapterConstraint, FactoryKind, Lifetime } from "./types/adapter-types.js";
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
export declare function isLifetime(value: unknown): value is Lifetime;
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
export declare function isFactoryKind(value: unknown): value is FactoryKind;
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
export declare function isAdapter(value: unknown): value is AdapterConstraint;
