/**
 * Container ID generator.
 *
 * Provides unique IDs for child containers across all container creation paths.
 *
 * @packageDocumentation
 */

/**
 * Module-level counter for child container IDs.
 * Shared across all container creation to ensure unique IDs.
 * @internal
 */
let childContainerCounter = 0;

/**
 * Generates a unique ID for a child container.
 *
 * Uses a monotonically increasing counter to ensure uniqueness
 * across all container creation paths (root.createChild, child.createChild, etc.).
 *
 * @returns A unique container ID in the format "child-N"
 * @internal
 */
export function generateChildContainerId(): string {
  return `child-${++childContainerCounter}`;
}

/**
 * Resets the container ID counter.
 *
 * ONLY FOR TESTING - allows predictable IDs in test suites.
 * Should never be called in production code.
 *
 * @internal
 */
export function resetChildContainerIdCounter(): void {
  childContainerCounter = 0;
}
