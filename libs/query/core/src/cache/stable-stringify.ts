/**
 * Deterministic JSON serialization.
 *
 * Produces the same string regardless of key insertion order, enabling
 * stable cache key generation.
 *
 * @packageDocumentation
 */

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively serializes a value to a deterministic JSON string.
 * Object keys are sorted lexicographically; arrays preserve order.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }

  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }

  if (isRecord(value)) {
    const sortedKeys = Object.keys(value).sort();
    const pairs = sortedKeys.map(key => JSON.stringify(key) + ":" + stableStringify(value[key]));
    return "{" + pairs.join(",") + "}";
  }

  return JSON.stringify(value) ?? "undefined";
}
