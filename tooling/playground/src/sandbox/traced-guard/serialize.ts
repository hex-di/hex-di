/**
 * Value serialization for Guard panel payloads.
 *
 * @internal
 */

import type { SerializedValue } from "./types.js";

const MAX_DEPTH = 3;
const MAX_STRING_LENGTH = 200;
const MAX_COLLECTION_SIZE = 10;

function serializePrimitive(value: unknown): SerializedValue | undefined {
  if (value === null) return { type: "null" };
  if (value === undefined) return { type: "undefined" };

  if (typeof value === "string") {
    const truncated = value.length > MAX_STRING_LENGTH;
    return {
      type: "string",
      value: truncated ? value.slice(0, MAX_STRING_LENGTH) + "…" : value,
    };
  }
  if (typeof value === "number") return { type: "number", value };
  if (typeof value === "boolean") return { type: "boolean", value };
  if (typeof value === "function") {
    return { type: "function", name: value.name || "anonymous" };
  }
  if (typeof value === "symbol" || typeof value === "bigint") {
    return { type: "string", value: String(value) };
  }
  return undefined;
}

function serializeCollection(value: unknown, depth: number): SerializedValue | undefined {
  if (value instanceof Set) {
    const items: SerializedValue[] = [];
    let count = 0;
    for (const v of value) {
      if (count >= MAX_COLLECTION_SIZE) break;
      items.push(serializeGuardValue(v, depth + 1));
      count++;
    }
    return { type: "set", items, truncated: value.size > MAX_COLLECTION_SIZE };
  }

  if (value instanceof Map) {
    const entries = new Map<string, SerializedValue>();
    let count = 0;
    for (const [k, v] of value) {
      if (count >= MAX_COLLECTION_SIZE) break;
      entries.set(String(k), serializeGuardValue(v, depth + 1));
      count++;
    }
    return { type: "map", entries, truncated: value.size > MAX_COLLECTION_SIZE };
  }

  if (Array.isArray(value)) {
    const truncated = value.length > MAX_COLLECTION_SIZE;
    const items = value
      .slice(0, MAX_COLLECTION_SIZE)
      .map(item => serializeGuardValue(item, depth + 1));
    return { type: "array", items, truncated };
  }

  return undefined;
}

export function serializeGuardValue(value: unknown, depth: number = 0): SerializedValue {
  if (depth > MAX_DEPTH) {
    return { type: "string", value: "[max depth]" };
  }

  const primitive = serializePrimitive(value);
  if (primitive !== undefined) return primitive;

  const collection = serializeCollection(value, depth);
  if (collection !== undefined) return collection;

  // Plain object
  try {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const truncated = keys.length > MAX_COLLECTION_SIZE;
    const entries = new Map<string, SerializedValue>();
    const limit = Math.min(keys.length, MAX_COLLECTION_SIZE);
    for (let i = 0; i < limit; i++) {
      entries.set(keys[i], serializeGuardValue(record[keys[i]], depth + 1));
    }
    return { type: "object", entries, truncated };
  } catch {
    return { type: "string", value: "[Object]" };
  }
}
