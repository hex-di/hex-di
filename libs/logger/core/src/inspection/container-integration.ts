/**
 * Container integration for the logger inspector.
 *
 * Provides a lazy factory that registers the logger inspector
 * with a container's inspector registry when first accessed.
 *
 * @packageDocumentation
 */

import type { LoggerInspectorAdapter, CreateLoggerInspectorOptions } from "./inspector.js";
import { createLoggerInspectorAdapter } from "./inspector.js";

/**
 * Creates a lazy logger inspector that initializes on first access.
 *
 * @param options - Options forwarded to createLoggerInspectorAdapter
 * @returns A factory function that returns the inspector, creating it if needed
 */
export function createLazyLoggerInspector(
  options?: CreateLoggerInspectorOptions
): () => LoggerInspectorAdapter {
  let instance: LoggerInspectorAdapter | undefined;

  return () => {
    if (instance === undefined) {
      instance = createLoggerInspectorAdapter(options);
    }
    return instance;
  };
}
