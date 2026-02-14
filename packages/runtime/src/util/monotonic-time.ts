/**
 * Provides a monotonic high-resolution timestamp.
 *
 * Uses `performance.now()` when available (Node.js, browsers),
 * falling back to `Date.now()` in restricted environments.
 *
 * Accesses `performance` via `globalThis` to avoid requiring
 * `@types/node` or the `dom` lib in the TypeScript configuration.
 *
 * @returns Timestamp in milliseconds (monotonic, sub-millisecond precision when available)
 * @internal
 */
export function monotonicNow(): number {
  const g = globalThis as Record<string, unknown>;
  const perf = g.performance as { now?: () => number } | undefined;
  if (perf !== undefined && typeof perf.now === "function") {
    return perf.now();
  }
  return Date.now();
}
