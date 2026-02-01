/**
 * Type guard functions for runtime type validation.
 *
 * These functions provide runtime validation of types that are otherwise
 * only known at compile time, enabling safe type narrowing.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";

/**
 * Type guard to check if a value is a valid Port.
 *
 * A valid Port must be an object with a `__portName` property that is a string.
 *
 * @param value - The value to check
 * @returns true if the value is a valid Port, false otherwise
 *
 * @remarks
 * This function checks the minimal requirements for a Port:
 * - Must be an object (not null)
 * - Must have a `__portName` property
 * - The `__portName` property must be a string
 *
 * @example
 * ```typescript
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * if (isPort(value)) {
 *   // value is now typed as Port<unknown, string>
 *   console.log(value.__portName);
 * }
 * ```
 */
export function isPort(value: unknown): value is Port<unknown, string> {
  if (!hasProperty(value, "__portName")) {
    return false;
  }

  return typeof value.__portName === "string";
}

/**
 * Type guard to check if a value is a specific Port type.
 *
 * Checks both that the value is a Port and that its name matches the expected name.
 *
 * @typeParam TName - The expected port name
 * @param value - The value to check
 * @param expectedName - The expected port name
 * @returns true if the value is a Port with the expected name, false otherwise
 *
 * @remarks
 * This function is useful when you need to validate that a value is a specific port
 * before using it in type-sensitive contexts.
 *
 * @example
 * ```typescript
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * if (isPortNamed(value, 'Logger')) {
 *   // value is now typed as Port<unknown, 'Logger'>
 * }
 * ```
 */
export function isPortNamed<TName extends string>(
  value: unknown,
  expectedName: TName
): value is Port<unknown, TName> {
  return isPort(value) && value.__portName === expectedName;
}

function hasProperty<Key extends PropertyKey>(
  value: unknown,
  key: Key
): value is { [P in Key]: unknown } {
  return typeof value === "object" && value !== null && key in value;
}
