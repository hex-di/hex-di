/**
 * In-Memory Persister
 *
 * Built-in SagaPersister implementation backed by a Map.
 * Suitable for testing and development; not production-suitable since
 * state does not survive process restarts.
 *
 * @packageDocumentation
 */

import { ResultAsync, tryCatch } from "@hex-di/result";
import type {
  SagaPersister,
  SagaExecutionState,
  PersistenceError,
  PersisterFilters,
} from "../ports/types.js";

/**
 * Converts a sync Result<T, PersistenceError> to ResultAsync<T, PersistenceError>
 * using the ResultAsync class constructors to avoid the interface/class #private mismatch.
 */
function liftResult<T>(
  result: ReturnType<typeof tryCatch<T, PersistenceError>>
): ResultAsync<T, PersistenceError> {
  return result.match(
    (value): ResultAsync<T, PersistenceError> => ResultAsync.ok(value),
    (error): ResultAsync<T, PersistenceError> => ResultAsync.err(error)
  );
}

/**
 * Creates an in-memory SagaPersister backed by a Map for O(1) lookup.
 *
 * Uses structuredClone on read/write to prevent external mutation of
 * internal state, mirroring the isolation guarantees of a real database.
 */
export function createInMemoryPersister(): SagaPersister {
  const store = new Map<string, SagaExecutionState>();

  return {
    save(state: SagaExecutionState): ResultAsync<void, PersistenceError> {
      return liftResult(
        tryCatch(
          () => {
            store.set(state.executionId, structuredClone(state));
          },
          (cause): PersistenceError => ({ _tag: "SerializationFailure", cause })
        )
      );
    },

    load(executionId: string): ResultAsync<SagaExecutionState | null, PersistenceError> {
      const state = store.get(executionId);
      if (!state) {
        return ResultAsync.ok(null);
      }
      return liftResult(
        tryCatch(
          () => structuredClone(state),
          (cause): PersistenceError => ({ _tag: "StorageFailure", operation: "load", cause })
        )
      );
    },

    delete(executionId: string): ResultAsync<void, PersistenceError> {
      store.delete(executionId);
      return ResultAsync.ok(undefined);
    },

    list(filters?: PersisterFilters): ResultAsync<SagaExecutionState[], PersistenceError> {
      let results = [...store.values()];

      if (filters?.sagaName) {
        const sagaName = filters.sagaName;
        results = results.filter(s => s.sagaName === sagaName);
      }
      if (filters?.status) {
        const status = filters.status;
        results = results.filter(s => s.status === status);
      }
      if (filters?.limit) {
        results = results.slice(0, filters.limit);
      }

      return liftResult(
        tryCatch(
          () => results.map(s => structuredClone(s)),
          (cause): PersistenceError => ({ _tag: "StorageFailure", operation: "list", cause })
        )
      );
    },

    update(
      executionId: string,
      updates: Partial<SagaExecutionState>
    ): ResultAsync<void, PersistenceError> {
      const existing = store.get(executionId);
      if (!existing) {
        return ResultAsync.err({
          _tag: "NotFound",
          executionId,
        });
      }

      const updated = { ...existing, ...updates };
      return liftResult(
        tryCatch(
          () => {
            store.set(executionId, structuredClone(updated));
          },
          (cause): PersistenceError => ({ _tag: "SerializationFailure", cause })
        )
      );
    },
  };
}
