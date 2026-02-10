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
// @ts-nocheck

/**
 * Type for container ID generator function.
 *
 * A generator produces unique container IDs in the format "child-N".
 */ function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("536")) {
    {
    }
  } else {
    stryCov_9fa48("536");
    let counter = 0;
    return (): string => {
      if (stryMutAct_9fa48("537")) {
        {
        }
      } else {
        stryCov_9fa48("537");
        return stryMutAct_9fa48("538")
          ? ``
          : (stryCov_9fa48("538"),
            `child-${stryMutAct_9fa48("539") ? --counter : (stryCov_9fa48("539"), ++counter)}`);
      }
    };
  }
}

/**
 * Holder for the default container ID generator.
 *
 * This is an object to allow resetting the generator while maintaining
 * the same reference from `generateChildContainerId()`.
 *
 * @internal
 */
const defaultGeneratorHolder = stryMutAct_9fa48("540")
  ? {}
  : (stryCov_9fa48("540"),
    {
      generator: createContainerIdGenerator(),
    });

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
  if (stryMutAct_9fa48("541")) {
    {
    }
  } else {
    stryCov_9fa48("541");
    return defaultGeneratorHolder.generator();
  }
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
  if (stryMutAct_9fa48("542")) {
    {
    }
  } else {
    stryCov_9fa48("542");
    defaultGeneratorHolder.generator = createContainerIdGenerator();
  }
}
