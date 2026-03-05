/**
 * Runtime Type Guards for Resource Polymorphism
 *
 * @packageDocumentation
 */

import type { ResourceKind } from "./types.js";

/**
 * Check if a config object represents a disposable adapter.
 *
 * @param config - The adapter config to check
 * @returns `true` if the config has a `finalizer` function
 */
export function isDisposableConfig(config: Record<string, unknown>): boolean {
  return typeof config["finalizer"] === "function";
}

/**
 * Infer resource kind from a config object at runtime.
 *
 * @param config - The adapter config to inspect
 * @returns The inferred resource kind
 */
export function inferResourceKind(config: Record<string, unknown>): ResourceKind {
  return isDisposableConfig(config) ? "disposable" : "non-disposable";
}
