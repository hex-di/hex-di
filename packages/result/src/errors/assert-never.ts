/**
 * Exhaustiveness check helper for discriminated unions.
 *
 * Call in the `default` branch of a switch statement to ensure all
 * variants of a discriminated union are handled. If a new variant is added
 * and not handled, TypeScript reports:
 * `"Argument of type 'NewVariant' is not assignable to parameter of type 'never'."`
 *
 * At runtime, if ever reached (indicating a type system bypass or data corruption),
 * throws an `Error` with a descriptive message including the unexpected value.
 *
 * @example
 * ```ts
 * import { ok, err, assertNever } from '@hex-di/result';
 * import type { Result } from '@hex-di/result';
 *
 * function handle(result: Result<number, string>): string {
 *   switch (result._tag) {
 *     case "Ok":
 *       return `Value: ${result.value}`;
 *     case "Err":
 *       return `Error: ${result.error}`;
 *     default:
 *       return assertNever(result);
 *   }
 * }
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/08-error-patterns.md — BEH-08-002
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}
