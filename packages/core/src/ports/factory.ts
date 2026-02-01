/**
 * Port Factory Module
 *
 * Provides factory functions for creating typed port tokens.
 *
 * @packageDocumentation
 */

import type { Port } from "./types.js";

// =============================================================================
// Internal Port Creation Helper
// =============================================================================

/**
 * Runtime representation of a Port object.
 *
 * At runtime, Port objects only contain `__portName`. The `__brand` property
 * exists only at the type level for nominal typing (phantom type pattern).
 *
 * @internal
 */
interface PortRuntime<TName extends string> {
  readonly __portName: TName;
}

/**
 * Creates a Port value with phantom type parameters.
 *
 * ## SAFETY DOCUMENTATION
 *
 * The Port type has a branded property `[__brand]: [T, TName]` that exists ONLY
 * at the type level for nominal typing. At runtime, only `__portName` exists.
 *
 * This is safe because:
 * 1. **Brand is never accessed**: The `__brand` symbol is used exclusively for
 *    compile-time type discrimination. No runtime code reads this property.
 *
 * 2. **Immutability guaranteed**: `Object.freeze()` prevents any mutation,
 *    ensuring the runtime object cannot be modified to invalidate type assumptions.
 *
 * 3. **Single creation point**: This is the ONLY location where Port values are
 *    created, ensuring all ports have consistent structure.
 *
 * 4. **Phantom type pattern**: This follows the well-established phantom type
 *    pattern where type parameters carry compile-time information without
 *    runtime representation. See: https://wiki.haskell.org/Phantom_type
 *
 * ## Type Safety via Overloads
 *
 * This function uses overloads to bridge the phantom type gap:
 * - The public signature returns `Port<TService, TName>` (phantom-branded type)
 * - The implementation signature returns `PortRuntime<TName>` (runtime structure)
 *
 * This is type-safe because:
 * - `PortRuntime` structurally contains all runtime properties
 * - The phantom brand is only used for compile-time discrimination
 * - No runtime code accesses the `__brand` property
 *
 * @internal - Not part of public API. Use createPort() or port() instead.
 */
function unsafeCreatePort<TService, TName extends string>(name: TName): Port<TService, TName>;
function unsafeCreatePort<TName extends string>(name: TName): PortRuntime<TName> {
  return Object.freeze({ __portName: name });
}

// =============================================================================
// createPort Function
// =============================================================================

/**
 * Creates a typed port token for a service interface.
 *
 * This function creates a minimal runtime object that serves as a unique
 * identifier for a service interface. The port can be used both as a value
 * (for registration in containers/graphs) and as a type (via `typeof`).
 *
 * @typeParam TName - The literal string type for the port name.
 *   Uses `const` modifier to preserve literal types without explicit annotation.
 * @typeParam TService - The service interface type (phantom type).
 *   This type exists only at compile time and is not used at runtime.
 *
 * @param name - The unique name for this port. Will be preserved as a literal type.
 *
 * @returns A frozen Port object with the `__portName` property set to the provided name.
 *   The returned object is immutable and has minimal runtime footprint.
 *
 * @remarks
 * - The `TService` type parameter is a phantom type - it only exists at compile time
 * - The returned object is frozen via `Object.freeze()` for immutability
 * - The brand property exists only at the type level (zero runtime overhead)
 * - Use `typeof PortName` to get the Port type for type annotations
 *
 * @see {@link Port} - The branded port type returned by this function
 * @see {@link InferService} - Utility to extract the service type from a port
 * @see {@link InferPortName} - Utility to extract the name type from a port
 *
 * @example Basic usage
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create a port token (value + type duality)
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * // Use as value for registration
 * container.register(LoggerPort, consoleLoggerAdapter);
 *
 * // Use typeof for type annotations
 * type LoggerPortType = typeof LoggerPort;
 * function getLogger(port: LoggerPortType): Logger { ... }
 * ```
 *
 * @example Multiple ports for same interface
 * ```typescript
 * // Different adapters for the same service interface
 * const ConsoleLoggerPort = createPort<'ConsoleLogger', Logger>('ConsoleLogger');
 * const FileLoggerPort = createPort<'FileLogger', Logger>('FileLogger');
 *
 * // These are type-incompatible despite same service interface
 * // ConsoleLoggerPort !== FileLoggerPort at the type level
 * ```
 */
export function createPort<const TName extends string, TService>(
  name: TName
): Port<TService, TName> {
  return unsafeCreatePort<TService, TName>(name);
}

// =============================================================================
// port - Curried API for Partial Type Inference
// =============================================================================

/**
 * Creates a typed port token with partial type inference.
 *
 * This is a curried version of `createPort` that enables a more ergonomic API:
 * - You explicitly specify the service type `TService`
 * - The port name `TName` is automatically inferred from the string argument
 *
 * @typeParam TService - The service interface type (explicitly provided)
 *
 * @returns A function that accepts the port name and returns a Port
 *
 * @remarks
 * This uses the curried function pattern to work around TypeScript's limitation
 * that prevents partial type argument inference. By splitting the type parameters
 * across two function calls, we can infer `TName` while explicitly specifying `TService`.
 *
 * @see {@link createPort} - The non-curried version requiring both type params
 * @see {@link Port} - The branded port type returned
 *
 * @example Basic usage
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Before: Both type params required, name duplicated
 * const LoggerPort = createPort<"Logger", Logger>("Logger");
 *
 * // After: Only service type needed, name inferred
 * const LoggerPort = port<Logger>()("Logger");
 * ```
 *
 * @example Multiple ports
 * ```typescript
 * interface Database {
 *   query(sql: string): Promise<unknown>;
 * }
 *
 * const LoggerPort = port<Logger>()("Logger");
 * const DatabasePort = port<Database>()("Database");
 *
 * // Names are correctly inferred as literal types
 * type LoggerName = typeof LoggerPort["__portName"];  // "Logger"
 * type DbName = typeof DatabasePort["__portName"];    // "Database"
 * ```
 */
export function port<TService>() {
  return <const TName extends string>(name: TName): Port<TService, TName> => {
    return unsafeCreatePort<TService, TName>(name);
  };
}
