/**
 * Runtime error formatting functions.
 *
 * These functions format runtime errors to match compile-time error messages.
 * This ensures consistent error messages regardless of when the error is detected.
 *
 * @packageDocumentation
 */

/**
 * Formats a runtime cycle detection result into a compile-time compatible error message.
 *
 * This ensures that errors detected at runtime (due to exceeding the MaxDepth limit)
 * have the same format as errors detected at compile time.
 *
 * @param cyclePath - Array of port names forming the cycle (e.g., ["A", "B", "C", "A"])
 * @returns Formatted error message matching the compile-time CircularErrorMessage format
 *
 * @example
 * ```typescript
 * const cycle = detectCycleAtRuntime(graph.adapters);
 * if (cycle) {
 *   throw new Error(formatCycleError(cycle));
 *   // Throws: "ERROR[HEX002]: Circular dependency: A -> B -> C -> A. Fix: Break cycle..."
 * }
 * ```
 */
export function formatCycleError(cyclePath: string[]): string {
  const pathString = cyclePath.join(" -> ");
  return `ERROR[HEX002]: Circular dependency: ${pathString}. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.`;
}

/**
 * Formats a missing dependency error for runtime.
 *
 * @param missingPorts - Array of port names that are missing
 * @returns Formatted error message matching the compile-time MissingDependencyError format
 *
 * @example
 * ```typescript
 * const missing = ["Logger", "Database"];
 * throw new Error(formatMissingDepsError(missing));
 * // Throws: "ERROR[HEX008]: Missing adapters for Logger, Database. Call .provide() first."
 * ```
 */
export function formatMissingDepsError(missingPorts: string[]): string {
  const portsString = missingPorts.join(", ");
  return `ERROR[HEX008]: Missing adapters for ${portsString}. Call .provide() first.`;
}

/**
 * Formats a captive dependency error for runtime.
 *
 * @param dependentName - Name of the adapter with the longer lifetime
 * @param dependentLifetime - Lifetime of the dependent adapter (e.g., "Singleton")
 * @param captivePortName - Name of the captured dependency
 * @param captiveLifetime - Lifetime of the captured dependency (e.g., "Scoped")
 * @returns Formatted error message matching the compile-time CaptiveErrorMessage format
 */
export function formatCaptiveError(
  dependentName: string,
  dependentLifetime: string,
  captivePortName: string,
  captiveLifetime: string
): string {
  return (
    `ERROR[HEX003]: Captive dependency: ${dependentLifetime} '${dependentName}' cannot depend on ` +
    `${captiveLifetime} '${captivePortName}'. Fix: Change '${dependentName}' to ${captiveLifetime}/Transient, ` +
    `or change '${captivePortName}' to ${dependentLifetime}.`
  );
}

/**
 * Formats a duplicate adapter error for runtime.
 *
 * @param portName - Name of the port that has duplicate providers
 * @returns Formatted error message matching the compile-time DuplicateErrorMessage format
 */
export function formatDuplicateError(portName: string): string {
  return `ERROR[HEX001]: Duplicate adapter for '${portName}'. Fix: Remove one .provide() call, or use .override() for child graphs.`;
}
