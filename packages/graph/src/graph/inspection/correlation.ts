/**
 * Correlation ID Generation.
 *
 * This module provides utilities for generating unique correlation IDs
 * for inspection tracing and debugging.
 *
 * ## Design
 *
 * Uses the factory pattern to create isolated generators with no global state.
 * Each generator has its own internal counter, ensuring:
 *
 * - **Test isolation**: No shared state between tests
 * - **Parallel safety**: Multiple generators can run without conflicts
 * - **Dependency injection**: Pass generators as dependencies
 *
 * ## Uniqueness Guarantees
 *
 * Counter-based IDs include a process-unique random prefix to prevent
 * cross-session collisions. A generation counter handles the theoretical
 * overflow case at Number.MAX_SAFE_INTEGER.
 *
 * @packageDocumentation
 */

/**
 * Type for correlation ID generator function.
 *
 * A generator produces unique correlation IDs, either:
 * - Counter-based (default): Incrementing IDs like "insp_{processId}_{counter}_{suffix}"
 * - Seeded (with seed parameter): Deterministic IDs based on the seed hash
 */
export type CorrelationIdGenerator = (seed?: string) => string;

/**
 * Maximum safe counter value. When exceeded, counter resets to 0
 * with a generation suffix to maintain uniqueness.
 */
const MAX_COUNTER = Number.MAX_SAFE_INTEGER - 1;

/**
 * Creates an isolated correlation ID generator with its own internal counter.
 *
 * This factory function creates a generator that has its own independent state.
 * Multiple generators can operate in parallel without conflicts.
 *
 * ## Use Cases
 *
 * - **Testing**: Each test can create its own generator for isolation
 * - **Dependency injection**: Pass generators as dependencies instead of using globals
 * - **Parallel operations**: Multiple inspectors can run without counter conflicts
 *
 * @returns A new `CorrelationIdGenerator` function with its own counter
 *
 * @example Creating isolated generators
 * ```typescript
 * const gen1 = createCorrelationIdGenerator();
 * const gen2 = createCorrelationIdGenerator();
 *
 * gen1();  // "insp_a1b2c3_0_0000"
 * gen1();  // "insp_a1b2c3_1_0001"
 * gen2();  // "insp_x4y5z6_0_0000" (independent counter, different prefix)
 * ```
 *
 * @example Dependency injection
 * ```typescript
 * function inspect(
 *   graph: Graph,
 *   generator: CorrelationIdGenerator = createCorrelationIdGenerator()
 * ) {
 *   const correlationId = generator();
 *   // ...
 * }
 * ```
 *
 * @example Seeded mode for deterministic IDs
 * ```typescript
 * const generate = createCorrelationIdGenerator();
 * generate("test-seed"); // Always produces the same ID for "test-seed"
 * generate("test-seed"); // Same ID as above
 * generate();            // Counter-based ID unaffected by seeded calls
 * ```
 */
export function createCorrelationIdGenerator(): CorrelationIdGenerator {
  let counter = 0;
  let generation = 0;

  // Process-unique prefix to avoid cross-session collisions
  const processId = Math.random().toString(36).substring(2, 8);

  return (seed?: string): string => {
    if (seed !== undefined) {
      // Seeded mode: hash the seed for deterministic output
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
      }
      const suffix = hash.toString(36).substring(0, 4).padEnd(4, "0");
      return `insp_${hash}_${suffix}`;
    }

    // Counter-based mode: deterministic within this generator
    const current = counter;
    counter++;
    if (counter > MAX_COUNTER) {
      counter = 0;
      generation++;
    }

    const suffix = current.toString(36).padStart(4, "0");
    const genPart = generation > 0 ? `_g${generation}` : "";
    return `insp_${processId}_${current}_${suffix}${genPart}`;
  };
}
