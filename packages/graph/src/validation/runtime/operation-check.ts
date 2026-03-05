/**
 * Runtime Operation Completeness Verification.
 *
 * Verifies that adapter factory return values implement all methods
 * declared by the port interface (via the port's `methods` metadata).
 *
 * This is an opt-in check: ports without `methods` metadata are skipped.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";
import { getPortMetadata } from "@hex-di/core";

/**
 * Checks whether an adapter's resolved instance implements all methods
 * declared in the port's `methods` metadata.
 *
 * @param adapter - The adapter to check (uses its `provides` port for metadata)
 * @param instance - The resolved service instance to verify
 * @returns Array of missing method names, empty if all are present
 *
 * @example
 * ```typescript
 * const missing = checkOperationCompleteness(adapter, resolvedInstance);
 * if (missing.length > 0) {
 *   console.error(`Missing methods: ${missing.join(', ')}`);
 * }
 * ```
 */
export function checkOperationCompleteness(
  adapter: AdapterConstraint,
  instance: unknown
): ReadonlyArray<string> {
  const metadata = getPortMetadata(adapter.provides);

  // If no methods metadata, skip check
  if (metadata?.methods === undefined || metadata.methods.length === 0) {
    return [];
  }

  // If instance is not an object, all methods are missing
  if (instance === null || instance === undefined || typeof instance !== "object") {
    return metadata.methods;
  }

  const missing: string[] = [];
  for (const method of metadata.methods) {
    if (!(method in instance)) {
      missing.push(method);
    }
  }
  return missing;
}

/**
 * Gets the method names declared by a port's metadata.
 *
 * @param adapter - The adapter to check
 * @returns The declared method names, or undefined if not specified
 */
export function getPortMethodNames(adapter: AdapterConstraint): ReadonlyArray<string> | undefined {
  const metadata = getPortMetadata(adapter.provides);
  return metadata?.methods;
}
