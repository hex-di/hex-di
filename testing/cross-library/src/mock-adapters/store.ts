/**
 * In-memory state and atom adapters for integration testing.
 *
 * Simulates @hex-di/store StatePort and AtomPort behavior without requiring
 * the actual @hex-di/store package. These are pure TypeScript implementations
 * that mirror the spec'd API surface.
 *
 * When @hex-di/store is implemented, these stubs should be replaced with
 * imports from "@hex-di/store" for the type definitions.
 */

// ---------------------------------------------------------------------------
// Type stubs (will come from @hex-di/store when implemented)
// ---------------------------------------------------------------------------

/** A reducer function: takes current state and optional payload, returns new state */
type ActionReducer<TState, TPayload = void> = [TPayload] extends [void]
  ? (state: TState) => TState
  : (state: TState, payload: TPayload) => TState;

/** Map of action name to reducer -- each value is a function (state, payload?) => state */
type ActionMap<TState> = Record<string, (state: TState, ...args: never[]) => TState>;

/** Subscription callback */
type StateSubscriber<TState> = (state: TState, prevState: TState) => void;

/** Unsubscribe function returned by subscribe */
type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// StateAdapterSpy - tracks dispatched actions for assertions
// ---------------------------------------------------------------------------

/** Record of a dispatched action for test assertions */
interface DispatchedAction<TState> {
  readonly actionName: string;
  readonly payload: unknown;
  readonly prevState: TState;
  readonly nextState: TState;
  readonly timestamp: number;
}

/** Spy interface for tracking dispatched actions */
interface StateAdapterSpy<TState> {
  /** All dispatched actions in order */
  readonly dispatched: ReadonlyArray<DispatchedAction<TState>>;
  /** Clear the dispatched actions history */
  clear(): void;
  /** Get dispatched actions filtered by action name */
  getByAction(actionName: string): ReadonlyArray<DispatchedAction<TState>>;
  /** Get the last dispatched action */
  readonly last: DispatchedAction<TState> | undefined;
  /** Get the count of dispatched actions */
  readonly count: number;
}

// ---------------------------------------------------------------------------
// InMemoryStateAdapter
// ---------------------------------------------------------------------------

/** Check if a function has exactly 2+ parameters by testing if it requires a second arg */
type HasPayload<F, TState> = F extends (state: TState, ...rest: infer R) => TState
  ? R extends []
    ? false
    : true
  : false;

/** Extract the payload type from a reducer with 2 parameters */
type ExtractPayload<F, TState> = F extends (state: TState, payload: infer P) => TState ? P : never;

/** Bound actions: each action is callable without passing the state */
type BoundActions<TState, TActions extends ActionMap<TState>> = {
  readonly [K in keyof TActions]: HasPayload<TActions[K], TState> extends true
    ? (payload: ExtractPayload<TActions[K], TState>) => void
    : () => void;
};

/** The resolved state service mock */
interface InMemoryStateService<TState, TActions extends ActionMap<TState>> {
  /** Current state (readonly snapshot) */
  readonly state: TState;
  /** Bound action dispatchers */
  readonly actions: BoundActions<TState, TActions>;
  /** Subscribe to state changes */
  subscribe(callback: StateSubscriber<TState>): Unsubscribe;
  /** Spy for tracking dispatched actions in tests */
  readonly spy: StateAdapterSpy<TState>;
  /** Reset state to initial value and clear spy history */
  reset(): void;
}

/** Configuration for creating an in-memory state adapter */
interface InMemoryStateAdapterConfig<TState, TActions extends ActionMap<TState>> {
  /** Display name for the state adapter */
  readonly name: string;
  /** Initial state value */
  readonly initial: TState;
  /** Action reducer implementations */
  readonly actions: TActions;
}

/**
 * Creates an in-memory state adapter for integration testing.
 *
 * Simulates @hex-di/store StatePort behavior:
 * - Holds reactive state with typed actions
 * - Tracks dispatched actions for test assertions
 * - Supports subscriptions for state change observation
 *
 * @example
 * ```typescript
 * const adapter = createInMemoryStateAdapter({
 *   name: "UserList",
 *   initial: { users: [], lastSyncedAt: null },
 *   actions: {
 *     setUsers: (state, users: User[]) => ({ ...state, users }),
 *     markSynced: (state) => ({ ...state, lastSyncedAt: Date.now() }),
 *   },
 * });
 *
 * adapter.actions.setUsers([{ id: "1", name: "Alice" }]);
 * expect(adapter.state.users).toHaveLength(1);
 * expect(adapter.spy.count).toBe(1);
 * ```
 */
function createInMemoryStateAdapter<TState, TActions extends ActionMap<TState>>(
  config: InMemoryStateAdapterConfig<TState, TActions>
): InMemoryStateService<TState, TActions> {
  let currentState = config.initial;
  const subscribers = new Set<StateSubscriber<TState>>();
  const dispatchedActions: Array<DispatchedAction<TState>> = [];

  const spy: StateAdapterSpy<TState> = {
    get dispatched() {
      return [...dispatchedActions];
    },
    clear() {
      dispatchedActions.length = 0;
    },
    getByAction(actionName: string) {
      return dispatchedActions.filter(a => a.actionName === actionName);
    },
    get last() {
      return dispatchedActions[dispatchedActions.length - 1];
    },
    get count() {
      return dispatchedActions.length;
    },
  };

  const recordAndNotify = (
    actionName: string,
    payload: unknown,
    prevState: TState,
    nextState: TState
  ): void => {
    dispatchedActions.push({
      actionName,
      payload,
      prevState,
      nextState,
      timestamp: Date.now(),
    });

    for (const subscriber of subscribers) {
      subscriber(nextState, prevState);
    }
  };

  const boundActions: Record<string, (payload: unknown) => void> = {};
  for (const name of Object.keys(config.actions)) {
    boundActions[name] = (payload: unknown) => {
      const prevState = currentState;
      const reducer = config.actions[name];
      // Dynamic invocation bypasses the never[] parameter constraint.
      // At runtime, all reducers are (state, payload?) => state.
      const args: unknown[] = payload === undefined ? [prevState] : [prevState, payload];
      // Reflect.apply returns unknown here since the reducer constraint uses never[]
      currentState = Reflect.apply(reducer, undefined, args) as typeof currentState;
      recordAndNotify(name, payload, prevState, currentState);
    };
  }

  const service: InMemoryStateService<TState, TActions> = {
    get state() {
      return currentState;
    },
    actions: boundActions as BoundActions<TState, TActions>,
    subscribe(callback: StateSubscriber<TState>): Unsubscribe {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    spy,
    reset() {
      currentState = config.initial;
      dispatchedActions.length = 0;
      subscribers.clear();
    },
  };

  return service;
}

// ---------------------------------------------------------------------------
// InMemoryAtomAdapter
// ---------------------------------------------------------------------------

/** Subscription callback for atoms */
type AtomSubscriber<TValue> = (value: TValue, prevValue: TValue) => void;

/** The resolved atom service mock */
interface InMemoryAtomService<TValue> {
  /** Current value */
  readonly value: TValue;
  /** Set a new value */
  set(value: TValue): void;
  /** Update the value using a function */
  update(fn: (current: TValue) => TValue): void;
  /** Subscribe to value changes */
  subscribe(callback: AtomSubscriber<TValue>): Unsubscribe;
  /** History of all values set (for assertions) */
  readonly history: ReadonlyArray<{ readonly value: TValue; readonly timestamp: number }>;
  /** Reset to initial value and clear history */
  reset(): void;
}

/** Configuration for creating an in-memory atom adapter */
interface InMemoryAtomAdapterConfig<TValue> {
  /** Display name for the atom adapter */
  readonly name: string;
  /** Initial value */
  readonly initial: TValue;
}

/**
 * Creates an in-memory atom adapter for integration testing.
 *
 * Simulates @hex-di/store AtomPort behavior:
 * - Holds a single reactive value with get/set/update
 * - Tracks value history for test assertions
 * - Supports subscriptions for value change observation
 *
 * @example
 * ```typescript
 * const theme = createInMemoryAtomAdapter({
 *   name: "Theme",
 *   initial: "light" as "light" | "dark",
 * });
 *
 * theme.set("dark");
 * expect(theme.value).toBe("dark");
 * expect(theme.history).toHaveLength(2); // initial + set
 * ```
 */
function createInMemoryAtomAdapter<TValue>(
  config: InMemoryAtomAdapterConfig<TValue>
): InMemoryAtomService<TValue> {
  let currentValue = config.initial;
  const subscribers = new Set<AtomSubscriber<TValue>>();
  const valueHistory: Array<{ readonly value: TValue; readonly timestamp: number }> = [
    { value: config.initial, timestamp: Date.now() },
  ];

  const service: InMemoryAtomService<TValue> = {
    get value() {
      return currentValue;
    },
    set(value: TValue): void {
      const prev = currentValue;
      currentValue = value;
      valueHistory.push({ value, timestamp: Date.now() });
      for (const subscriber of subscribers) {
        subscriber(value, prev);
      }
    },
    update(fn: (current: TValue) => TValue): void {
      service.set(fn(currentValue));
    },
    subscribe(callback: AtomSubscriber<TValue>): Unsubscribe {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    get history() {
      return [...valueHistory];
    },
    reset(): void {
      currentValue = config.initial;
      valueHistory.length = 0;
      valueHistory.push({ value: config.initial, timestamp: Date.now() });
      subscribers.clear();
    },
  };

  return service;
}

export { createInMemoryStateAdapter, createInMemoryAtomAdapter };

export type {
  ActionReducer,
  ActionMap,
  StateSubscriber,
  Unsubscribe,
  DispatchedAction,
  StateAdapterSpy,
  BoundActions,
  InMemoryStateService,
  InMemoryStateAdapterConfig,
  AtomSubscriber,
  InMemoryAtomService,
  InMemoryAtomAdapterConfig,
};
