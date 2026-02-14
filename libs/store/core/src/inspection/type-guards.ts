/**
 * Type Guards for Store Inspection Dependencies
 *
 * Structural type guards for extracting inspection-related dependencies
 * from adapter factory `deps` records without type casting.
 *
 * @packageDocumentation
 */

import type { StoreInspectorInternal } from "../types/inspection.js";
import type { StoreRegistry } from "../types/inspection.js";
import type { StoreTracingHook } from "../integration/tracing-bridge.js";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if an unknown value is a non-null object with a given method.
 */
function hasMethod(value: unknown, name: string): boolean {
  if (typeof value !== "object" || value === null) return false;
  if (!(name in value)) return false;
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (descriptor !== undefined) return typeof descriptor.value === "function";
  // Property exists (inherited or getter) — check via prototype traversal
  let proto: object | null = value;
  while (proto !== null) {
    const pd = Object.getOwnPropertyDescriptor(proto, name);
    if (pd !== undefined) return typeof pd.value === "function";
    proto = Reflect.getPrototypeOf(proto);
  }
  return false;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Structural type guard for StoreInspectorInternal.
 * Checks for the `recordAction` and `emit` methods which are unique to the internal interface.
 */
export function isStoreInspectorInternal(value: unknown): value is StoreInspectorInternal {
  return (
    hasMethod(value, "recordAction") &&
    hasMethod(value, "emit") &&
    hasMethod(value, "incrementPendingEffects")
  );
}

/**
 * Structural type guard for StoreRegistry.
 * Checks for the `register` and `getAll` methods.
 */
export function isStoreRegistry(value: unknown): value is StoreRegistry {
  return (
    hasMethod(value, "register") && hasMethod(value, "getAll") && hasMethod(value, "subscribe")
  );
}

/**
 * Structural type guard for StoreTracingHook.
 * Checks for the mandatory `onActionStart` and `onActionEnd` methods.
 */
export function isStoreTracingHook(value: unknown): value is StoreTracingHook {
  return hasMethod(value, "onActionStart") && hasMethod(value, "onActionEnd");
}

// =============================================================================
// Extractors (safe narrowing for deps records)
// =============================================================================

/**
 * Extracts StoreInspectorInternal from a deps value, returning undefined if not valid.
 */
export function extractStoreInspectorInternal(value: unknown): StoreInspectorInternal | undefined {
  return isStoreInspectorInternal(value) ? value : undefined;
}

/**
 * Extracts StoreRegistry from a deps value, returning undefined if not valid.
 */
export function extractStoreRegistry(value: unknown): StoreRegistry | undefined {
  return isStoreRegistry(value) ? value : undefined;
}

/**
 * Extracts StoreTracingHook from a deps value, returning undefined if not valid.
 */
export function extractStoreTracingHook(value: unknown): StoreTracingHook | undefined {
  return isStoreTracingHook(value) ? value : undefined;
}
