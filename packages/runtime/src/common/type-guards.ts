/**
 * Shared internal type guards for the runtime package.
 * @internal
 */

export function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}
