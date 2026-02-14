/**
 * Correlation ID utilities for tracing and debugging.
 *
 * ## Determinism
 *
 * The default generator uses a monotonic counter, producing strictly
 * ordered, deterministic IDs within a process. No randomness is used.
 *
 * ## Injectability
 *
 * Call `configureCorrelationId()` at application startup to inject
 * a custom generator (e.g., crypto-secure for GxP audit trails).
 *
 * @packageDocumentation
 */

/**
 * Configuration for the correlation ID generator.
 */
export interface CorrelationIdConfig {
  /**
   * Custom ID generator function. When provided, overrides the default
   * counter-based generator. Use this to inject crypto-secure generators
   * or test-deterministic generators.
   */
  readonly generator?: () => string;
}

/** Module-level monotonic counter for default ID generation. */
let _counter = 0;

/** Module-level generator override. */
let _customGenerator: (() => string) | undefined;

/**
 * Configures the correlation ID generator globally.
 *
 * Call this once at application startup to inject a custom generator.
 * If not called, the default counter-based generator is used.
 *
 * @param config - Generator configuration
 */
export function configureCorrelationId(config: CorrelationIdConfig): void {
  _customGenerator = config.generator;
}

/**
 * Resets the correlation ID generator to default state.
 *
 * Intended for test teardown only. Resets both the counter and
 * any custom generator.
 *
 * @internal
 */
export function resetCorrelationId(): void {
  _counter = 0;
  _customGenerator = undefined;
}

/**
 * Generates a unique correlation ID for tracing purposes.
 *
 * ## Default Behavior (no configuration)
 *
 * Uses a monotonic counter producing IDs in the format:
 * `corr_{counter}_{base36_suffix}`
 *
 * Example: "corr_0_0000", "corr_1_0001", "corr_2_0002"
 *
 * ## Properties
 *
 * - **Monotonic**: IDs are strictly ordered within a process
 * - **Deterministic**: Same call sequence produces same IDs (no randomness)
 * - **Collision-free**: Counter never repeats within a process lifetime
 * - **Injectable**: Call `configureCorrelationId()` to use crypto-secure
 *   or custom generators
 *
 * @returns A unique correlation ID string
 */
export function generateCorrelationId(): string {
  if (_customGenerator !== undefined) {
    return _customGenerator();
  }
  const current = _counter++;
  const suffix = current.toString(36).padStart(4, "0");
  return `corr_${current}_${suffix}`;
}
