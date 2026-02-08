/**
 * Mock Store Adapters
 *
 * Provides mock StateService and AtomService implementations with
 * spy tracking for testing.
 *
 * @packageDocumentation
 */

import type {
  ActionMap,
  StateService,
  StateListener,
  Unsubscribe,
  AtomService,
  DeepReadonly,
} from "@hex-di/store";

// =============================================================================
// MockStateAdapter
// =============================================================================

/** Configuration for a mock state adapter */
export interface MockStateAdapterConfig<TState, TActions extends ActionMap<TState>> {
  /** Initial state value */
  readonly initial: TState;
  /** Action implementations */
  readonly actions: TActions;
}

/** Spy tracking for dispatched actions */
export interface ActionSpy {
  /** Action name */
  readonly name: string;
  /** Arguments passed to the action (payload) */
  readonly args: ReadonlyArray<unknown>;
  /** Timestamp of the call */
  readonly timestamp: number;
}

/** A mock state service with spy tracking */
export interface MockStateService<TState, TActions extends ActionMap<TState>> extends StateService<
  TState,
  TActions
> {
  /** All recorded action dispatches */
  readonly actionSpies: ReadonlyArray<ActionSpy>;
  /** Number of action dispatches */
  readonly actionCount: number;
  /** Reset spy tracking and restore initial state */
  reset(): void;
  /** Force set the state (for test setup) */
  setState(state: TState): void;
}

/**
 * Creates a mock state service with action spies.
 *
 * @example
 * ```typescript
 * const mock = createMockStateAdapter({
 *   initial: { count: 0 },
 *   actions: { increment: (state) => ({ count: state.count + 1 }) },
 * });
 * mock.actions.increment();
 * expect(mock.actionCount).toBe(1);
 * expect(mock.state.count).toBe(1);
 * ```
 */
export function createMockStateAdapter<TState, TActions extends ActionMap<TState>>(
  config: MockStateAdapterConfig<TState, TActions>
): MockStateService<TState, TActions> {
  let _state = config.initial;
  const _spies: ActionSpy[] = [];
  const _listeners = new Set<StateListener<TState>>();
  const _initial = config.initial;

  function notify(prev: TState, next: TState): void {
    for (const listener of _listeners) {
      listener(next as DeepReadonly<TState>, prev as DeepReadonly<TState>);
    }
  }

  // Build bound actions
  type BoundActionFn = (...args: unknown[]) => void;
  const boundActions: Record<string, BoundActionFn> = {};
  for (const [name, reducer] of Object.entries(config.actions)) {
    const actionFn = reducer as (state: TState, ...args: unknown[]) => TState;
    boundActions[name] = (...args: unknown[]) => {
      _spies.push({ name, args, timestamp: Date.now() });
      const prev = _state;
      _state = actionFn(prev, ...args);
      notify(prev, _state);
    };
  }

  const service: MockStateService<TState, TActions> = {
    get state(): DeepReadonly<TState> {
      return _state as DeepReadonly<TState>;
    },
    get actions() {
      return boundActions as StateService<TState, TActions>["actions"];
    },
    subscribe(...args: unknown[]): Unsubscribe {
      if (args.length === 1 && typeof args[0] === "function") {
        const listener = args[0] as StateListener<TState>;
        _listeners.add(listener);
        return () => {
          _listeners.delete(listener);
        };
      }
      // Selector overload
      const selector = args[0] as (state: DeepReadonly<TState>) => unknown;
      const listener = args[1] as (value: unknown, prev: unknown) => void;
      const equalityFn = args[2] as ((a: unknown, b: unknown) => boolean) | undefined;

      let prevSelected = selector(_state as DeepReadonly<TState>);
      const stateListener: StateListener<TState> = state => {
        const selected = selector(state);
        const isEqual = equalityFn ? equalityFn(selected, prevSelected) : selected === prevSelected;
        if (!isEqual) {
          const prev = prevSelected;
          prevSelected = selected;
          listener(selected, prev);
        }
      };
      _listeners.add(stateListener);
      return () => {
        _listeners.delete(stateListener);
      };
    },
    get actionSpies(): ReadonlyArray<ActionSpy> {
      return _spies;
    },
    get actionCount(): number {
      return _spies.length;
    },
    reset(): void {
      _state = _initial;
      _spies.length = 0;
    },
    setState(state: TState): void {
      const prev = _state;
      _state = state;
      notify(prev, _state);
    },
  };

  return service;
}

// =============================================================================
// MockAtomAdapter
// =============================================================================

/** Configuration for a mock atom adapter */
export interface MockAtomAdapterConfig<TValue> {
  /** Initial value */
  readonly initial: TValue;
}

/** Spy types for atom operations */
export interface AtomSpy {
  readonly operation: "set" | "update";
  readonly value: unknown;
  readonly timestamp: number;
}

/** A mock atom service with spy tracking */
export interface MockAtomService<TValue> extends AtomService<TValue> {
  /** All recorded set/update operations */
  readonly spies: ReadonlyArray<AtomSpy>;
  /** Number of set/update operations */
  readonly spyCount: number;
  /** Reset spy tracking and restore initial value */
  reset(): void;
}

/**
 * Creates a mock atom service with set/update spies.
 *
 * @example
 * ```typescript
 * const mock = createMockAtomAdapter({ initial: 0 });
 * mock.set(5);
 * expect(mock.spyCount).toBe(1);
 * expect(mock.value).toBe(5);
 * ```
 */
export function createMockAtomAdapter<TValue>(
  config: MockAtomAdapterConfig<TValue>
): MockAtomService<TValue> {
  let _value = config.initial;
  const _spies: AtomSpy[] = [];
  const _listeners = new Set<(value: DeepReadonly<TValue>, prev: DeepReadonly<TValue>) => void>();
  const _initial = config.initial;

  function notify(prev: TValue, next: TValue): void {
    for (const listener of _listeners) {
      listener(next as DeepReadonly<TValue>, prev as DeepReadonly<TValue>);
    }
  }

  return {
    get value(): DeepReadonly<TValue> {
      return _value as DeepReadonly<TValue>;
    },
    set(value: TValue): void {
      _spies.push({ operation: "set", value, timestamp: Date.now() });
      const prev = _value;
      _value = value;
      notify(prev, _value);
    },
    update(fn: (current: TValue) => TValue): void {
      const next = fn(_value);
      _spies.push({ operation: "update", value: next, timestamp: Date.now() });
      const prev = _value;
      _value = next;
      notify(prev, _value);
    },
    subscribe(
      listener: (value: DeepReadonly<TValue>, prev: DeepReadonly<TValue>) => void
    ): Unsubscribe {
      _listeners.add(listener);
      return () => {
        _listeners.delete(listener);
      };
    },
    get spies(): ReadonlyArray<AtomSpy> {
      return _spies;
    },
    get spyCount(): number {
      return _spies.length;
    },
    reset(): void {
      _value = _initial;
      _spies.length = 0;
    },
  };
}
