/**
 * Exhaustiveness check helper.
 * Call in the default branch of a switch statement to ensure all
 * variants of a discriminated union are handled.
 *
 * If a new variant is added to the union and not handled, TypeScript
 * reports: "Argument of type 'NewVariant' is not assignable to parameter
 * of type 'never'."
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}
