/**
 * Request deduplication for in-flight queries.
 *
 * Ensures that multiple concurrent requests for the same query key
 * share a single fetch operation.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import { narrowInflight } from "./type-boundary.js";

export interface DeduplicationMap {
  /**
   * Get or create an in-flight request.
   * Returns the existing promise if one is in flight, otherwise
   * calls the factory and stores its promise.
   */
  dedupe<TData, TError>(
    serializedKey: string,
    factory: () => ResultAsync<TData, TError>
  ): ResultAsync<TData, TError>;

  /**
   * Remove a key from the dedup map (after completion).
   */
  complete(serializedKey: string): void;

  /**
   * Check if a key is currently in flight.
   */
  has(serializedKey: string): boolean;

  /**
   * Cancel all in-flight requests.
   */
  cancelAll(): void;

  /** Number of in-flight requests */
  readonly size: number;
}

export function createDeduplicationMap(): DeduplicationMap {
  const inflight = new Map<
    string,
    { promise: ResultAsync<unknown, unknown>; controller: AbortController }
  >();

  return {
    dedupe<TData, TError>(
      serializedKey: string,
      factory: () => ResultAsync<TData, TError>
    ): ResultAsync<TData, TError> {
      const existing = inflight.get(serializedKey);
      if (existing) {
        return narrowInflight<TData, TError>(existing.promise);
      }

      const controller = new AbortController();
      const promise = factory();
      inflight.set(serializedKey, { promise, controller });

      // Auto-cleanup on settlement using mapBoth
      const cleanup = (): void => {
        inflight.delete(serializedKey);
      };
      void promise.mapBoth(cleanup, cleanup);

      return promise;
    },

    has(serializedKey: string): boolean {
      return inflight.has(serializedKey);
    },

    complete(serializedKey: string): void {
      inflight.delete(serializedKey);
    },

    cancelAll(): void {
      for (const [, entry] of inflight) {
        entry.controller.abort();
      }
      inflight.clear();
    },

    get size(): number {
      return inflight.size;
    },
  };
}
