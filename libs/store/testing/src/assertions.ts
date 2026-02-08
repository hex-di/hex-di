/**
 * Store Assertion Helpers
 *
 * Fluent assertion helpers for state, atom, derived, and async derived services.
 *
 * @packageDocumentation
 */

import { expect } from "vitest";
import type {
  DeepReadonly,
  StateService,
  AtomService,
  DerivedService,
  AsyncDerivedService,
  AsyncDerivedSnapshot,
  ActionMap,
} from "@hex-di/store";

// =============================================================================
// expectState
// =============================================================================

/** Fluent assertions for state services */
export interface StateAssertions<TState> {
  /** Assert state is deeply equal to the expected value */
  toBe(expected: TState): void;
  /** Assert state matches a partial object */
  toMatch(partial: Partial<TState>): void;
  /** Assert state satisfies a predicate */
  toSatisfy(predicate: (state: DeepReadonly<TState>) => boolean): void;
}

/**
 * Creates fluent assertions for a state service.
 *
 * @example
 * ```typescript
 * expectState(stateService).toBe({ count: 5 });
 * expectState(stateService).toMatch({ count: 5 });
 * expectState(stateService).toSatisfy(s => s.count > 0);
 * ```
 */
export function expectState<TState, TActions extends ActionMap<TState>>(
  service: StateService<TState, TActions>
): StateAssertions<TState> {
  return {
    toBe(expected: TState): void {
      expect(service.state).toEqual(expected);
    },
    toMatch(partial: Partial<TState>): void {
      expect(service.state).toMatchObject(partial as Record<string, unknown>);
    },
    toSatisfy(predicate: (state: DeepReadonly<TState>) => boolean): void {
      expect(predicate(service.state)).toBe(true);
    },
  };
}

// =============================================================================
// expectAtom
// =============================================================================

/** Fluent assertions for atom services */
export interface AtomAssertions<TValue> {
  /** Assert atom value is deeply equal */
  toBe(expected: TValue): void;
  /** Assert atom value satisfies a predicate */
  toSatisfy(predicate: (value: DeepReadonly<TValue>) => boolean): void;
}

/**
 * Creates fluent assertions for an atom service.
 *
 * @example
 * ```typescript
 * expectAtom(atomService).toBe(42);
 * ```
 */
export function expectAtom<TValue>(service: AtomService<TValue>): AtomAssertions<TValue> {
  return {
    toBe(expected: TValue): void {
      expect(service.value).toEqual(expected);
    },
    toSatisfy(predicate: (value: DeepReadonly<TValue>) => boolean): void {
      expect(predicate(service.value)).toBe(true);
    },
  };
}

// =============================================================================
// expectDerived
// =============================================================================

/** Fluent assertions for derived services */
export interface DerivedAssertions<TResult> {
  /** Assert derived value is deeply equal */
  toBe(expected: TResult): void;
  /** Assert derived value matches partial */
  toMatch(partial: Partial<TResult>): void;
  /** Assert derived value satisfies a predicate */
  toSatisfy(predicate: (value: DeepReadonly<TResult>) => boolean): void;
}

/**
 * Creates fluent assertions for a derived service.
 *
 * @example
 * ```typescript
 * expectDerived(derivedService).toBe({ total: 100 });
 * ```
 */
export function expectDerived<TResult>(
  service: DerivedService<TResult>
): DerivedAssertions<TResult> {
  return {
    toBe(expected: TResult): void {
      expect(service.value).toEqual(expected);
    },
    toMatch(partial: Partial<TResult>): void {
      expect(service.value).toMatchObject(partial as Record<string, unknown>);
    },
    toSatisfy(predicate: (value: DeepReadonly<TResult>) => boolean): void {
      expect(predicate(service.value)).toBe(true);
    },
  };
}

// =============================================================================
// expectAsyncDerived
// =============================================================================

/** Fluent assertions for async derived services */
export interface AsyncDerivedAssertions<TResult, E> {
  /** Assert status is "loading" */
  toBeLoading(): void;
  /** Assert status is "success" with optional data check */
  toBeSuccess(data?: TResult): void;
  /** Assert status is "error" */
  toBeError(): void;
  /** Assert the current status matches */
  toHaveStatus(status: AsyncDerivedSnapshot<TResult, E>["status"]): void;
}

/**
 * Creates fluent assertions for an async derived service.
 *
 * @example
 * ```typescript
 * expectAsyncDerived(asyncService).toBeLoading();
 * expectAsyncDerived(asyncService).toBeSuccess({ data: 'hello' });
 * expectAsyncDerived(asyncService).toHaveStatus('idle');
 * ```
 */
export function expectAsyncDerived<TResult, E = never>(
  service: AsyncDerivedService<TResult, E>
): AsyncDerivedAssertions<TResult, E> {
  return {
    toBeLoading(): void {
      expect(service.status).toBe("loading");
      expect(service.isLoading).toBe(true);
    },
    toBeSuccess(data?: TResult): void {
      expect(service.status).toBe("success");
      if (data !== undefined) {
        expect(service.snapshot.data).toEqual(data);
      }
    },
    toBeError(): void {
      expect(service.status).toBe("error");
    },
    toHaveStatus(status: AsyncDerivedSnapshot<TResult, E>["status"]): void {
      expect(service.status).toBe(status);
    },
  };
}
