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
 * @packageDocumentation
 */
/**
 * Type for correlation ID generator function.
 *
 * A generator produces unique correlation IDs, either:
 * - Counter-based (default): Incrementing IDs like "insp_0_0000", "insp_1_0001"
 * - Seeded (with seed parameter): Deterministic IDs based on the seed hash
 */
export type CorrelationIdGenerator = (seed?: string) => string;
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
 * gen1();  // "insp_0_0000"
 * gen1();  // "insp_1_0001"
 * gen2();  // "insp_0_0000" (independent counter)
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
 * generate();            // "insp_0_0000" - counter unaffected by seeded calls
 * ```
 */
export declare function createCorrelationIdGenerator(): CorrelationIdGenerator;
