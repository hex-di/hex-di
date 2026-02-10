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
  BoundActions,
  StateService,
  StateListener,
  Unsubscribe,
  AtomService,
  DeepReadonly,
} from "@hex-di/store";
import { deepFreeze } from "@hex-di/store";

// =============================================================================
// Dynamic dispatch bridge
// =============================================================================

/**
 * Bridges static/dynamic dispatch for functions typed with never[] rest params.
 *
 * ActionMap reducers use `(state, ...args: never[]) => state` to prevent
 * direct invocation. This helper invokes them via a property descriptor
 * swap to avoid type casts.
 */
function applyDynamic<R>(fn: (...args: never[]) => R, args: readonly unknown[]): R;
function applyDynamic(fn: (...args: never[]) => unknown, args: readonly unknown[]): unknown {
  const wrapper: { invoke(...a: unknown[]): unknown } = { invoke: () => undefined };
  Object.defineProperty(wrapper, "invoke", { value: fn });
  return wrapper.invoke(...args);
}

function callReducer<TState>(
  reducer: (state: TState, ...args: never[]) => TState,
  state: TState,
  args: readonly unknown[]
): TState {
  return applyDynamic(reducer, [state, ...args]);
}

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
      listener(deepFreeze(next), deepFreeze(prev));
    }
  }

  // Build bound actions using function overload to bridge generic/runtime types.
  // The overload signature returns BoundActions; the implementation works with
  // Record<string, Function> which is structurally identical at runtime.
  function buildBoundActions(): BoundActions<TState, TActions>;
  function buildBoundActions(): Record<string, (...args: unknown[]) => void> {
    const record: Record<string, (...args: unknown[]) => void> = {};
    for (const name of Object.keys(config.actions)) {
      const reducer = config.actions[name];
      if (!reducer) continue;
      record[name] = (...args: unknown[]) => {
        _spies.push({ name, args, timestamp: Date.now() });
        const prev = _state;
        _state = callReducer(reducer, prev, args);
        notify(prev, _state);
      };
    }
    return Object.freeze(record);
  }

  const boundActions = buildBoundActions();

  // Separate subscribe implementations for each overload
  function subscribeToState(listener: StateListener<TState>): Unsubscribe {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }

  function subscribeToSelector<TSelected>(
    selector: (state: DeepReadonly<TState>) => TSelected,
    listener: (value: TSelected, prev: TSelected) => void,
    equalityFn?: (a: TSelected, b: TSelected) => boolean
  ): Unsubscribe {
    let prevSelected = selector(deepFreeze(_state));
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
  }

  // Overloaded subscribe matching StateService interface
  function subscribeImpl(listener: StateListener<TState>): Unsubscribe;
  function subscribeImpl<TSelected>(
    selector: (state: DeepReadonly<TState>) => TSelected,
    listener: (value: TSelected, prev: TSelected) => void,
    equalityFn?: (a: TSelected, b: TSelected) => boolean
  ): Unsubscribe;
  function subscribeImpl(...args: [unknown, ...unknown[]]): Unsubscribe {
    if (args.length === 1) {
      return applyDynamic(subscribeToState, args);
    }
    return applyDynamic(subscribeToSelector, args);
  }

  const service: MockStateService<TState, TActions> = {
    get state(): DeepReadonly<TState> {
      return deepFreeze(_state);
    },
    get actions() {
      return boundActions;
    },
    subscribe: subscribeImpl,
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
    get isDisposed(): boolean {
      return false;
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
      listener(deepFreeze(next), deepFreeze(prev));
    }
  }

  return {
    get value(): DeepReadonly<TValue> {
      return deepFreeze(_value);
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
    get isDisposed(): boolean {
      return false;
    },
  };
}
