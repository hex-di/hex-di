/**
 * Container ID Generator.
 *
 * Uses the factory pattern to create isolated ID generators with no global state.
 * Each generator has its own internal counter, ensuring:
 *
 * - **Test isolation**: Each test can create its own generator
 * - **Uniqueness within hierarchy**: Containers share a generator for unique IDs
 * - **Parallel safety**: Different container hierarchies don't conflict
 *
 * @packageDocumentation
 */

/**
 * Type for container ID generator function.
 *
 * A generator produces unique container IDs in the format "child-N".
 */
export type ContainerIdGenerator = () => string;

/**
 * Creates an isolated container ID generator with its own internal counter.
 *
 * This factory function creates a generator that has its own independent state.
 * Typically, a root container creates one generator and passes it to all child
 * containers, ensuring unique IDs within the container hierarchy.
 *
 * ## Use Cases
 *
 * - **Root container**: Creates a generator to share with its children
 * - **Testing**: Each test can create its own generator for isolation
 * - **Parallel trees**: Different container trees get independent counters
 *
 * @returns A new `ContainerIdGenerator` function with its own counter
 *
 * @example Creating a generator for a container tree
 * ```typescript
 * const idGenerator = createContainerIdGenerator();
 * idGenerator(); // "child-1"
 * idGenerator(); // "child-2"
 * ```
 *
 * @example Test isolation
 * ```typescript
 * it("should have unique container IDs", () => {
 *   const idGenerator = createContainerIdGenerator();
 *   // Each test gets its own isolated generator
 * });
 * ```
 *
 * @internal
 */
export function createContainerIdGenerator(): ContainerIdGenerator {
  let counter = 0;

  return (): string => {
    return `child-${++counter}`;
  };
}

/**
 * Holder for the default container ID generator.
 *
 * This is an object to allow resetting the generator while maintaining
 * the same reference from `generateChildContainerId()`.
 *
 * @internal
 */
const defaultGeneratorHolder = {
  generator: createContainerIdGenerator(),
};

/**
 * Generates a unique ID for a child container.
 *
 * Uses a default generator for backward compatibility.
 * For new code with testing needs, prefer using `createContainerIdGenerator()`
 * to create isolated generators.
 *
 * @returns A unique container ID in the format "child-N"
 * @internal
 */
export function generateChildContainerId(): string {
  return defaultGeneratorHolder.generator();
}

/**
 * Resets the default container ID counter.
 *
 * Creates a new generator instance to reset the counter to 0.
 * This is useful for testing to ensure predictable container IDs.
 *
 * Note: This only resets the default generator used by `generateChildContainerId()`.
 * Generators created via `createContainerIdGenerator()` are not affected.
 *
 * @internal
 */
export function resetChildContainerIdCounter(): void {
  defaultGeneratorHolder.generator = createContainerIdGenerator();
}
