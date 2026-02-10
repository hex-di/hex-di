/**
 * Proxy-Based Path Tracking
 *
 * Records which property paths a selector accesses, enabling fine-grained
 * change detection that skips selector execution when only unrelated
 * parts of state change.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Result of tracking a selector's property accesses.
 */
export interface TrackingResult<S> {
  /** The value returned by the selector */
  readonly value: S;
  /** Dot-delimited property paths accessed during selector execution */
  readonly paths: ReadonlySet<string>;
}

// =============================================================================
// Helpers
// =============================================================================

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

// =============================================================================
// createTrackingProxy
// =============================================================================

/**
 * Creates a proxy that records all property access paths as dot-delimited strings.
 *
 * Nested object access creates child proxies with prefix propagation.
 * Symbol keys are ignored (only string keys tracked).
 * null/undefined intermediates stop recursion.
 * Works on frozen objects (get traps are allowed on frozen objects).
 */
export function createTrackingProxy<T>(state: T): { proxy: T; paths: Set<string> } {
  const paths = new Set<string>();

  function makeProxy<U>(target: U, prefix: string): U {
    if (!isRecord(target)) return target;

    return new Proxy(target, {
      get(obj, prop, receiver) {
        // Only track string keys, skip symbols
        if (typeof prop === "symbol") {
          const symbolValue: unknown = Reflect.get(obj, prop, receiver);
          return symbolValue;
        }

        const path = prefix ? `${prefix}.${prop}` : prop;
        paths.add(path);

        const value: unknown = Reflect.get(obj, prop, receiver);

        // Recurse into nested objects/arrays, but respect Proxy invariants:
        // non-configurable non-writable properties must return their actual value.
        if (isRecord(value)) {
          const desc = Object.getOwnPropertyDescriptor(obj, prop);
          if (desc && !desc.configurable && !desc.writable) {
            // Can't return a different object — just track and return original
            return value;
          }
          return makeProxy(value, path);
        }

        return value;
      },
    });
  }

  const proxy = makeProxy(state, "");
  return { proxy, paths };
}

// =============================================================================
// trackSelector
// =============================================================================

/**
 * Runs a selector through a tracking proxy, returning the result and
 * the set of property paths accessed during execution.
 */
export function trackSelector<T, S>(state: T, selector: (s: T) => S): TrackingResult<S> {
  const { proxy, paths } = createTrackingProxy(state);
  const value = selector(proxy);
  return { value, paths };
}

// =============================================================================
// hasPathChanged
// =============================================================================

/**
 * Compares two objects only at the tracked paths using `Object.is`.
 *
 * Returns `true` if any tracked path has a different value between
 * `prev` and `next`. Returns `false` when all tracked paths are identical.
 */
export function hasPathChanged<T>(prev: T, next: T, paths: ReadonlySet<string>): boolean {
  for (const path of paths) {
    const segments = path.split(".");
    let prevVal: unknown = prev;
    let nextVal: unknown = next;

    for (const seg of segments) {
      prevVal = isRecord(prevVal) ? prevVal[seg] : undefined;
      nextVal = isRecord(nextVal) ? nextVal[seg] : undefined;
    }

    if (!Object.is(prevVal, nextVal)) {
      return true;
    }
  }

  return false;
}
