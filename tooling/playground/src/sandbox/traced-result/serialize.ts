/**
 * Value serialization for Result chain tracing.
 *
 * @internal
 */

import type { SerializedValue } from "./types.js";

const MAX_DEPTH = 3;
const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_LENGTH = 10;

function serializePrimitive(value: unknown): SerializedValue | undefined {
  if (value === null) {
    return { data: null, typeName: "null", truncated: false };
  }
  if (value === undefined) {
    return { data: null, typeName: "undefined", truncated: false };
  }
  if (typeof value === "string") {
    const truncated = value.length > MAX_STRING_LENGTH;
    return {
      data: truncated ? value.slice(0, MAX_STRING_LENGTH) + "…" : value,
      typeName: "String",
      truncated,
    };
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return {
      data: value,
      typeName: typeof value === "number" ? "Number" : "Boolean",
      truncated: false,
    };
  }
  if (typeof value === "bigint") {
    return { data: String(value) + "n", typeName: "BigInt", truncated: false };
  }
  if (typeof value === "symbol") {
    return { data: String(value), typeName: "Symbol", truncated: false };
  }
  if (typeof value === "function") {
    const name = value.name || "anonymous";
    return { data: `[Function: ${name}]`, typeName: "Function", truncated: false };
  }
  return undefined;
}

function serializeKnownObject(value: unknown, depth: number): SerializedValue | undefined {
  if (value instanceof Error) {
    return {
      data: { name: value.name, message: value.message },
      typeName: "Error",
      truncated: false,
    };
  }
  if (Array.isArray(value)) {
    const truncated = value.length > MAX_ARRAY_LENGTH;
    const items = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map(item => serializeForTrace(item, depth + 1).data);
    if (truncated) {
      items.push(`... +${value.length - MAX_ARRAY_LENGTH} more`);
    }
    return { data: items, typeName: "Array", truncated };
  }
  if (value instanceof Map) {
    const entries: Record<string, unknown> = {};
    let count = 0;
    for (const [k, v] of value) {
      if (count >= MAX_ARRAY_LENGTH) break;
      entries[String(k)] = serializeForTrace(v, depth + 1).data;
      count++;
    }
    return { data: entries, typeName: "Map", truncated: value.size > MAX_ARRAY_LENGTH };
  }
  if (value instanceof Set) {
    const items: unknown[] = [];
    let count = 0;
    for (const v of value) {
      if (count >= MAX_ARRAY_LENGTH) break;
      items.push(serializeForTrace(v, depth + 1).data);
      count++;
    }
    return { data: items, typeName: "Set", truncated: value.size > MAX_ARRAY_LENGTH };
  }
  return undefined;
}

export function serializeForTrace(value: unknown, depth: number = 0): SerializedValue {
  if (depth > MAX_DEPTH) {
    return { data: "[max depth]", typeName: typeof value, truncated: true };
  }

  const primitive = serializePrimitive(value);
  if (primitive !== undefined) return primitive;

  const known = serializeKnownObject(value, depth);
  if (known !== undefined) return known;

  // Plain object
  try {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const truncated = keys.length > MAX_ARRAY_LENGTH;
    const result: Record<string, unknown> = {};
    const limit = Math.min(keys.length, MAX_ARRAY_LENGTH);
    for (let i = 0; i < limit; i++) {
      result[keys[i]] = serializeForTrace(record[keys[i]], depth + 1).data;
    }
    return { data: result, typeName: "Object", truncated };
  } catch {
    return { data: "[Object]", typeName: "Object", truncated: true };
  }
}
