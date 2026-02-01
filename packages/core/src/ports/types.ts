/**
 * Port Types Module
 *
 * Provides the foundational Port type and related type utilities
 * for typed, branded port tokens.
 *
 * @packageDocumentation
 */

// =============================================================================
// Brand Symbol
// =============================================================================

/**
 * Unique symbol used for nominal typing of Port types.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to enable nominal typing,
 * ensuring that two ports with different names are type-incompatible
 * even if their service interfaces are structurally identical.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 */
declare const __brand: unique symbol;

// =============================================================================
// Port Type
// =============================================================================

/**
 * A branded port type that serves as a compile-time contract for a service interface.
 *
 * The Port type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. Two ports are only compatible if they have:
 * 1. The same service interface type `T`
 * 2. The same port name `TName`
 *
 * @typeParam T - The service interface type (phantom type - exists only at compile time)
 * @typeParam TName - The literal string type for the port name (defaults to `string`)
 *
 * @remarks
 * - The `__brand` property carries both the service type and name in a tuple
 * - The `__portName` property exposes the name for debugging and error messages
 * - Both properties are readonly to prevent modification
 * - The brand symbol value is `undefined` at runtime (zero overhead)
 *
 * @see {@link createPort} - Factory function to create port tokens
 * @see {@link InferService} - Utility to extract the service type from a port
 * @see {@link InferPortName} - Utility to extract the name type from a port
 *
 * @example Direct type usage
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create typed port tokens
 * type ConsoleLoggerPort = Port<Logger, 'ConsoleLogger'>;
 * type FileLoggerPort = Port<Logger, 'FileLogger'>;
 *
 * // These are type-incompatible despite same interface
 * declare const consolePort: ConsoleLoggerPort;
 * declare const filePort: FileLoggerPort;
 * // consolePort = filePort; // Type error!
 * ```
 *
 * @example With createPort (recommended)
 * ```typescript
 * // Use createPort for value + type duality
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type LoggerPortType = typeof LoggerPort;
 * ```
 */
export type Port<T, TName extends string = string> = {
  /**
   * Brand property for nominal typing.
   * Contains a tuple of [ServiceType, PortName] at the type level.
   * Value is undefined at runtime.
   */
  readonly [__brand]: [T, TName];

  /**
   * The port name, exposed for debugging and error messages.
   */
  readonly __portName: TName;
};

// =============================================================================
// Error Types for Type Utilities
// =============================================================================

/**
 * Error type returned when type inference utilities receive a non-Port type.
 *
 * This branded error provides actionable guidance in IDE tooltips when users
 * accidentally pass incorrect types to InferService or InferPortName.
 *
 * @typeParam T - The type that was passed (preserved for debugging)
 *
 * @remarks
 * Instead of returning opaque `never`, this error type provides:
 * - Clear error message explaining what was expected
 * - The actual type that was received (for debugging)
 * - A hint about common mistakes (e.g., forgetting `typeof`)
 *
 * @example IDE tooltip when misused
 * ```typescript
 * type Result = InferService<string>;
 * // Hovering shows:
 * // {
 * //   __errorBrand: "NotAPortError";
 * //   __message: "Expected a Port type created with createPort() or port()";
 * //   __received: string;
 * //   __hint: "Use InferService<typeof YourPort>, not InferService<YourPort>";
 * // }
 * ```
 */
export type NotAPortError<T> = {
  readonly __errorBrand: "NotAPortError";
  readonly __message: "Expected a Port type created with createPort() or port()";
  readonly __received: T;
  readonly __hint: "Use InferService<typeof YourPort>, not InferService<YourPort>";
};

// =============================================================================
// Type-Level Utilities
// =============================================================================

/**
 * Extracts the service interface type from a Port type.
 *
 * This utility type uses conditional type inference to extract the phantom
 * type parameter `T` from a `Port<T, TName>`. If the provided type is not
 * a valid Port, it returns a descriptive `NotAPortError` type.
 *
 * @typeParam P - The Port type to extract the service from
 * @returns The service interface type `T`, or `NotAPortError<P>` if P is not a Port
 *
 * @see {@link Port} - The port type this utility extracts from
 * @see {@link InferPortName} - Companion utility to extract the port name
 * @see {@link createPort} - Factory function to create port tokens
 * @see {@link NotAPortError} - The error type returned for invalid inputs
 *
 * @example Successful extraction
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type LoggerService = InferService<typeof LoggerPort>;
 * // LoggerService = Logger
 * ```
 *
 * @example Error case (descriptive error type)
 * ```typescript
 * type Invalid = InferService<string>;
 * // Invalid = NotAPortError<string>
 * // IDE shows: { __errorBrand: "NotAPortError", __message: "Expected a Port...", ... }
 * ```
 */
export type InferService<P> = P extends Port<infer T, infer _TName> ? T : NotAPortError<P>;

/**
 * Extracts the port name literal type from a Port type.
 *
 * This utility type uses conditional type inference to extract the name
 * type parameter `TName` from a `Port<T, TName>`. If the provided type is not
 * a valid Port, it returns a descriptive `NotAPortError` type.
 *
 * @typeParam P - The Port type to extract the name from
 * @returns The port name literal type `TName`, or `NotAPortError<P>` if P is not a Port
 *
 * @see {@link Port} - The port type this utility extracts from
 * @see {@link InferService} - Companion utility to extract the service type
 * @see {@link createPort} - Factory function to create port tokens
 * @see {@link NotAPortError} - The error type returned for invalid inputs
 *
 * @example Successful extraction
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type PortName = InferPortName<typeof LoggerPort>;
 * // PortName = 'Logger'
 * ```
 *
 * @example Error case (descriptive error type)
 * ```typescript
 * type Invalid = InferPortName<number>;
 * // Invalid = NotAPortError<number>
 * // IDE shows: { __errorBrand: "NotAPortError", __message: "Expected a Port...", ... }
 * ```
 */
export type InferPortName<P> = P extends Port<infer _T, infer TName> ? TName : NotAPortError<P>;
