/**
 * Utility functions for container tree traversal and instrumentation.
 *
 * Provides helper functions for mapping between InspectorAPI and Container,
 * filtering ports based on patterns, and managing tree-wide instrumentation.
 *
 * @packageDocumentation
 */

import type { InspectorAPI } from "@hex-di/core";
import type { HookableContainer } from "./types.js";

/**
 * WeakMap tracking InspectorAPI -> Container mappings.
 *
 * Since InspectorAPI doesn't provide a reverse lookup to get the Container,
 * we maintain a WeakMap to track the relationship. This is populated by
 * instrumentContainerTree when it instruments a container.
 *
 * Key: InspectorAPI instance
 * Value: Container instance (must have addHook/removeHook)
 */
const inspectorToContainer = new WeakMap<InspectorAPI, HookableContainer>();

/**
 * Registers a Container with its InspectorAPI for reverse lookup.
 *
 * This should be called when instrumenting a container to enable
 * child container instrumentation via InspectorAPI.getChildContainers().
 *
 * @param inspector - The InspectorAPI instance
 * @param container - The Container instance
 *
 * @internal
 */
export function registerContainerMapping(
  inspector: InspectorAPI,
  container: HookableContainer
): void {
  inspectorToContainer.set(inspector, container);
}

/**
 * Gets the Container instance associated with an InspectorAPI.
 *
 * Used by tree instrumentation to map child InspectorAPIs (obtained via
 * getChildContainers()) back to their Container instances for hook installation.
 *
 * @param inspector - The InspectorAPI instance
 * @returns The Container instance, or undefined if not found
 *
 * @remarks
 * This function returns undefined if:
 * - The inspector was never registered via registerContainerMapping
 * - The container was garbage collected (WeakMap cleared the entry)
 * - The inspector is from a different container hierarchy
 *
 * @example
 * ```typescript
 * const childInspectors = inspector.getChildContainers();
 * for (const childInspector of childInspectors) {
 *   const childContainer = getContainerFromInspector(childInspector);
 *   if (childContainer) {
 *     // Can now instrument the child container
 *     instrumentContainer(childContainer, tracer);
 *   }
 * }
 * ```
 */
export function getContainerFromInspector(inspector: InspectorAPI): HookableContainer | undefined {
  return inspectorToContainer.get(inspector);
}

/**
 * Checks if a port name matches a simple wildcard pattern.
 *
 * Supports:
 * - Exact matches: "Logger" matches "Logger"
 * - Prefix wildcards: "Logger*" matches "Logger", "LoggerService", etc.
 * - Suffix wildcards: "*Service" matches "LoggerService", "ApiService", etc.
 * - Full wildcards: "*" matches everything
 *
 * @param portName - The port name to check
 * @param pattern - The pattern to match against (may contain * wildcard)
 * @returns True if the port name matches the pattern
 *
 * @remarks
 * This is a simple pattern matcher for declarative port filters.
 * Only the * wildcard is supported (no regex or other special chars).
 *
 * @example
 * ```typescript
 * matchesPortPattern("Logger", "Logger")        // true (exact)
 * matchesPortPattern("LoggerService", "Logger*") // true (prefix)
 * matchesPortPattern("ApiService", "*Service")   // true (suffix)
 * matchesPortPattern("Logger", "Database")       // false
 * ```
 */
export function matchesPortPattern(portName: string, pattern: string): boolean {
  // Exact match
  if (pattern === portName) {
    return true;
  }

  // Full wildcard
  if (pattern === "*") {
    return true;
  }

  // Prefix wildcard: "Logger*"
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return portName.startsWith(prefix);
  }

  // Suffix wildcard: "*Service"
  if (pattern.startsWith("*")) {
    const suffix = pattern.slice(1);
    return portName.endsWith(suffix);
  }

  // No match
  return false;
}

/**
 * Checks if a port should be traced based on filter criteria.
 *
 * This extends evaluatePortFilter (from types.ts) with wildcard pattern support
 * for declarative filters. Use this when you need pattern matching in include/exclude arrays.
 *
 * @param portName - The port name to check
 * @param include - Optional array of patterns to include (undefined = include all)
 * @param exclude - Optional array of patterns to exclude (undefined = exclude none)
 * @returns True if the port should be traced
 *
 * @remarks
 * Filter evaluation logic:
 * 1. If include is specified, port must match at least one include pattern
 * 2. If exclude is specified, port must not match any exclude pattern
 * 3. If neither is specified, all ports are traced
 * 4. If both are specified, include takes precedence
 *
 * @example
 * ```typescript
 * // Include specific services
 * shouldTracePort("LoggerService", ["Logger*"], undefined)  // true
 * shouldTracePort("Database", ["Logger*"], undefined)       // false
 *
 * // Exclude specific services
 * shouldTracePort("Logger", undefined, ["Internal*"])       // true
 * shouldTracePort("InternalCache", undefined, ["Internal*"]) // false
 *
 * // Both include and exclude (include wins)
 * shouldTracePort("Logger", ["Logger"], ["*"])              // true
 * ```
 */
export function shouldTracePort(
  portName: string,
  include?: readonly string[],
  exclude?: readonly string[]
): boolean {
  // If include is specified, port must match at least one pattern
  if (include !== undefined) {
    return include.some(pattern => matchesPortPattern(portName, pattern));
  }

  // If exclude is specified, port must not match any pattern
  if (exclude !== undefined) {
    return !exclude.some(pattern => matchesPortPattern(portName, pattern));
  }

  // No filter = trace all ports
  return true;
}
