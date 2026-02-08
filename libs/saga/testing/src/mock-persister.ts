/**
 * Mock Saga Persister
 *
 * In-memory persister with spy tracking for testing.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type {
  SagaPersister,
  SagaExecutionState,
  PersistenceError,
  PersisterFilters,
} from "@hex-di/saga";

// =============================================================================
// Types
// =============================================================================

/** A mock persister that tracks all operations */
export interface MockSagaPersister {
  /** The persister implementation */
  readonly persister: SagaPersister;
  /** Number of save calls */
  readonly saveCount: number;
  /** Number of load calls */
  readonly loadCount: number;
  /** Number of delete calls */
  readonly deleteCount: number;
  /** Number of list calls */
  readonly listCount: number;
  /** Number of update calls */
  readonly updateCount: number;
  /** All stored execution states */
  readonly stored: ReadonlyMap<string, SagaExecutionState>;
  /** Reset all tracking data and stored state */
  reset(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a mock saga persister backed by a Map with call tracking.
 *
 * @example
 * ```typescript
 * const mock = createMockSagaPersister();
 * await mock.persister.save(executionState);
 * expect(mock.saveCount).toBe(1);
 * expect(mock.stored.size).toBe(1);
 * ```
 */
export function createMockSagaPersister(): MockSagaPersister {
  const store = new Map<string, SagaExecutionState>();
  let _saveCount = 0;
  let _loadCount = 0;
  let _deleteCount = 0;
  let _listCount = 0;
  let _updateCount = 0;

  const persister: SagaPersister = {
    save(state: SagaExecutionState): ResultAsync<void, PersistenceError> {
      _saveCount++;
      store.set(state.executionId, structuredClone(state));
      return ResultAsync.ok(undefined);
    },

    load(executionId: string): ResultAsync<SagaExecutionState | null, PersistenceError> {
      _loadCount++;
      const state = store.get(executionId);
      if (!state) {
        return ResultAsync.ok(null);
      }
      return ResultAsync.ok(structuredClone(state));
    },

    delete(executionId: string): ResultAsync<void, PersistenceError> {
      _deleteCount++;
      store.delete(executionId);
      return ResultAsync.ok(undefined);
    },

    list(filters?: PersisterFilters): ResultAsync<SagaExecutionState[], PersistenceError> {
      _listCount++;
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

      return ResultAsync.ok(results.map(s => structuredClone(s)));
    },

    update(
      executionId: string,
      updates: Partial<SagaExecutionState>
    ): ResultAsync<void, PersistenceError> {
      _updateCount++;
      const existing = store.get(executionId);
      if (!existing) {
        return ResultAsync.err({
          _tag: "NotFound" as const,
          executionId,
        });
      }
      store.set(executionId, structuredClone({ ...existing, ...updates }));
      return ResultAsync.ok(undefined);
    },
  };

  return {
    persister,
    get saveCount(): number {
      return _saveCount;
    },
    get loadCount(): number {
      return _loadCount;
    },
    get deleteCount(): number {
      return _deleteCount;
    },
    get listCount(): number {
      return _listCount;
    },
    get updateCount(): number {
      return _updateCount;
    },
    get stored(): ReadonlyMap<string, SagaExecutionState> {
      return store;
    },
    reset(): void {
      store.clear();
      _saveCount = 0;
      _loadCount = 0;
      _deleteCount = 0;
      _listCount = 0;
      _updateCount = 0;
    },
  };
}
