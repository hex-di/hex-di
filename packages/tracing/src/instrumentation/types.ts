/**
 * Types for container instrumentation and resolution filtering.
 *
 * Defines options for auto-instrumentation of dependency injection containers,
 * including filtering by port name, lifecycle phase, and minimum duration.
 *
 * @packageDocumentation
 */

/**
 * Port filter specification for selective instrumentation.
 *
 * Controls which ports should be traced during resolution:
 * - **Predicate**: Function that returns true for ports to trace
 * - **Declarative**: Object with include/exclude string arrays
 *
 * @remarks
 * When using the predicate form, the function receives the port name
 * and returns true to trace that port, false to skip it.
 *
 * When using the declarative form:
 * - If `include` is specified, only those ports are traced
 * - If `exclude` is specified, all ports except those are traced
 * - If both are specified, `include` takes precedence
 *
 * @example Predicate filter
 * ```typescript
 * const filter = (portName: string) => portName.startsWith('Api');
 * ```
 *
 * @example Declarative filter (include)
 * ```typescript
 * const filter = { include: ['Logger', 'Database'] };
 * ```
 *
 * @example Declarative filter (exclude)
 * ```typescript
 * const filter = { exclude: ['InternalCache', 'DebugHelper'] };
 * ```
 */
export type PortFilter =
  | ((portName: string) => boolean)
  | {
      readonly include?: readonly string[];
      readonly exclude?: readonly string[];
    };

/**
 * Options for automatic container instrumentation.
 *
 * Configures how resolution hooks create spans for dependency resolution,
 * including filtering, attribute injection, and performance thresholds.
 *
 * @remarks
 * All options are optional. Sensible defaults are provided for most use cases.
 *
 * **Default behavior:**
 * - Traces all sync and async resolutions
 * - Traces cached resolutions (shows cache hits in trace)
 * - No port filtering (all ports traced)
 * - No additional attributes
 * - No duration filtering (all spans recorded)
 * - No stack traces (minimal overhead)
 *
 * **Performance considerations:**
 * - `traceCachedResolutions: false` reduces span volume for high-traffic singletons
 * - `minDurationMs` filters out fast resolutions (e.g., minDurationMs: 10 ignores <10ms)
 * - `includeStackTrace: true` adds significant overhead, use only for debugging
 * - `portFilter` reduces tracing to specific services (e.g., only public APIs)
 *
 * @example Basic instrumentation
 * ```typescript
 * const options: AutoInstrumentOptions = {
 *   // Defaults are fine for most cases
 * };
 * ```
 *
 * @example Production-optimized configuration
 * ```typescript
 * const options: AutoInstrumentOptions = {
 *   traceCachedResolutions: false, // Skip cached singleton hits
 *   minDurationMs: 5,               // Only trace slow resolutions
 *   portFilter: {
 *     include: ['ApiService', 'DatabasePool'], // Only critical services
 *   },
 *   additionalAttributes: {
 *     'service.name': 'user-api',
 *     'deployment.environment': 'production',
 *   },
 * };
 * ```
 *
 * @example Debug configuration
 * ```typescript
 * const options: AutoInstrumentOptions = {
 *   includeStackTrace: true, // Capture call stacks
 *   additionalAttributes: {
 *     'debug.mode': true,
 *   },
 * };
 * ```
 */
export interface AutoInstrumentOptions {
  /**
   * Whether to trace synchronous resolutions.
   *
   * Synchronous resolutions are the most common case (non-async factories).
   * Disabling this effectively disables most tracing.
   *
   * @defaultValue true
   */
  readonly traceSyncResolutions?: boolean;

  /**
   * Whether to trace asynchronous resolutions.
   *
   * Async resolutions occur for ports with async factories, typically
   * during container initialization or lazy loading.
   *
   * @defaultValue true
   */
  readonly traceAsyncResolutions?: boolean;

  /**
   * Whether to trace cached resolutions (singleton/scoped cache hits).
   *
   * When true, cache hits create spans showing the cache lookup.
   * When false, only initial resolutions (cache misses) are traced.
   *
   * Setting this to false reduces span volume in production, but you
   * lose visibility into which services are being used most frequently.
   *
   * @defaultValue true
   */
  readonly traceCachedResolutions?: boolean;

  /**
   * Optional filter to limit which ports are traced.
   *
   * When specified, only ports matching the filter criteria will
   * create spans. Useful for reducing trace volume in production
   * or focusing on specific services during debugging.
   *
   * @defaultValue undefined (trace all ports)
   */
  readonly portFilter?: PortFilter;

  /**
   * Additional attributes to add to all spans.
   *
   * These attributes are merged with the standard instrumentation
   * attributes (port name, lifetime, etc.). Useful for adding
   * service-level context like environment, version, or tenant ID.
   *
   * Must be a flat object (no nested objects). Values must be
   * valid attribute values (string, number, boolean, or arrays thereof).
   *
   * @defaultValue undefined (no additional attributes)
   *
   * @example
   * ```typescript
   * additionalAttributes: {
   *   'service.name': 'user-api',
   *   'service.version': '1.2.3',
   *   'deployment.environment': 'production',
   *   'tenant.id': tenantId,
   * }
   * ```
   */
  readonly additionalAttributes?: Readonly<Record<string, unknown>>;

  /**
   * Minimum span duration in milliseconds to record.
   *
   * Spans with duration less than this threshold are discarded.
   * Useful for filtering out fast cache hits or trivial resolutions
   * in high-throughput production scenarios.
   *
   * The duration check happens at span-end time (not span-start),
   * so slow resolutions are always captured even if most are fast.
   *
   * @defaultValue 0 (no filtering, all spans recorded)
   *
   * @example
   * ```typescript
   * // Only trace resolutions that take 10ms or longer
   * minDurationMs: 10
   * ```
   */
  readonly minDurationMs?: number;

  /**
   * Whether to capture stack traces for each resolution.
   *
   * When true, adds a `stackTrace` attribute to each span containing
   * the call stack at the time of resolution. Very useful for debugging
   * unexpected dependencies or tracking where resolutions originate.
   *
   * **Warning:** Capturing stack traces has significant performance overhead.
   * Use only in development or debugging scenarios, not in production.
   *
   * @defaultValue false
   *
   * @example
   * ```typescript
   * // Enable for debugging
   * includeStackTrace: true
   * ```
   */
  readonly includeStackTrace?: boolean;
}

/**
 * Default instrumentation options.
 *
 * Provides sensible defaults for all fields:
 * - Trace all resolution types (sync, async, cached)
 * - No port filtering (trace all ports)
 * - No additional attributes
 * - No duration filtering (all spans recorded)
 * - No stack traces (minimal overhead)
 *
 * Use this as a starting point and override specific fields:
 * ```typescript
 * const options = {
 *   ...DEFAULT_INSTRUMENT_OPTIONS,
 *   traceCachedResolutions: false,
 * };
 * ```
 */
export const DEFAULT_INSTRUMENT_OPTIONS = {
  traceSyncResolutions: true,
  traceAsyncResolutions: true,
  traceCachedResolutions: true,
  portFilter: undefined,
  additionalAttributes: {},
  minDurationMs: 0,
  includeStackTrace: false,
} satisfies AutoInstrumentOptions;

/**
 * Type guard to check if a port filter is a predicate function.
 *
 * @param filter - The filter to check
 * @returns True if filter is a predicate function
 *
 * @example
 * ```typescript
 * if (isPredicateFilter(options.portFilter)) {
 *   const shouldTrace = options.portFilter('Logger');
 * }
 * ```
 */
export function isPredicateFilter(filter: PortFilter): filter is (portName: string) => boolean {
  return typeof filter === "function";
}

/**
 * Type guard to check if a port filter is a declarative object.
 *
 * @param filter - The filter to check
 * @returns True if filter is a declarative object with include/exclude arrays
 *
 * @example
 * ```typescript
 * if (isDeclarativeFilter(options.portFilter)) {
 *   const shouldTrace = options.portFilter.include?.includes('Logger');
 * }
 * ```
 */
export function isDeclarativeFilter(
  filter: PortFilter
): filter is { readonly include?: readonly string[]; readonly exclude?: readonly string[] } {
  return typeof filter === "object" && filter !== null;
}

/**
 * Evaluates a port filter to determine if a port should be traced.
 *
 * Handles both predicate and declarative filter forms:
 * - Predicate: Calls the function with the port name
 * - Declarative: Checks include/exclude arrays
 * - Undefined: Returns true (trace all ports)
 *
 * @param filter - The port filter (undefined means no filtering)
 * @param portName - The name of the port to check
 * @returns True if the port should be traced
 *
 * @example
 * ```typescript
 * const shouldTrace = evaluatePortFilter(options.portFilter, 'Logger');
 * if (shouldTrace) {
 *   // Create span for Logger resolution
 * }
 * ```
 */
export function evaluatePortFilter(filter: PortFilter | undefined, portName: string): boolean {
  if (filter === undefined) {
    return true; // No filter = trace all ports
  }

  if (isPredicateFilter(filter)) {
    return filter(portName);
  }

  // Declarative filter
  const { include, exclude } = filter;

  // If include is specified, port must be in the list
  if (include !== undefined) {
    return include.includes(portName);
  }

  // If exclude is specified, port must not be in the list
  if (exclude !== undefined) {
    return !exclude.includes(portName);
  }

  // No include or exclude = trace all ports
  return true;
}
