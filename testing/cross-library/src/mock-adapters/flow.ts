/**
 * Mock flow adapter and service for integration testing.
 *
 * Simulates @hex-di/flow FlowPort behavior without requiring the actual package.
 * These are pure TypeScript implementations that mirror the spec'd FlowService API.
 *
 * When @hex-di/flow is implemented, the type stubs should be replaced with
 * imports from "@hex-di/flow".
 */

// ---------------------------------------------------------------------------
// Type stubs (will come from @hex-di/flow when implemented)
// ---------------------------------------------------------------------------

/** Unsubscribe function */
type Unsubscribe = () => void;

/** Machine snapshot */
interface MachineSnapshot<TState extends string, TContext> {
  readonly state: TState;
  readonly context: TContext;
}

/** Transition configuration */
interface TransitionConfig<TState extends string> {
  readonly target: TState;
  readonly guard?: () => boolean;
}

/** State machine definition for the mock */
interface MockMachineDefinition<TState extends string, TEvent extends string, TContext> {
  readonly id: string;
  readonly initial: TState;
  readonly context: TContext;
  readonly states: {
    readonly [K in TState]: {
      readonly on?: Partial<Record<TEvent, TState | TransitionConfig<TState>>>;
      readonly type?: "final";
    };
  };
}

// ---------------------------------------------------------------------------
// MockFlowService
// ---------------------------------------------------------------------------

/** Record of an event sent for test assertions */
interface SentEvent<TEvent extends string> {
  readonly event: TEvent | "__FORCE__";
  readonly payload?: unknown;
  readonly timestamp: number;
  readonly prevState: string;
  readonly nextState: string;
  readonly transitioned: boolean;
}

/** The mock flow service */
interface MockFlowService<TState extends string, TEvent extends string, TContext> {
  /** Get current snapshot */
  snapshot(): MachineSnapshot<TState, TContext>;
  /** Get current state */
  state(): TState;
  /** Get current context */
  context(): TContext;
  /** Send an event (pure transition, no effects) */
  send(event: TEvent, payload?: unknown): { readonly success: boolean; readonly state: TState };
  /** Send an event and execute (simulated async) */
  sendAndExecute(
    event: TEvent,
    payload?: unknown
  ): Promise<{ readonly success: boolean; readonly state: TState }>;
  /** Subscribe to state changes */
  subscribe(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): Unsubscribe;
  /** Whether the service has been disposed */
  readonly isDisposed: boolean;
  /** Dispose the service */
  dispose(): Promise<void>;
  /** All sent events for test assertions */
  readonly sentEvents: ReadonlyArray<SentEvent<TEvent>>;
  /** Update context directly (test helper) */
  setContext(updater: (current: TContext) => TContext): void;
  /** Force a state transition (test helper, bypasses guards) */
  forceState(state: TState): void;
  /** Reset to initial state and clear event history */
  reset(): void;
}

/** Configuration for creating a mock flow service */
interface MockFlowServiceConfig<TState extends string, TEvent extends string, TContext> {
  /** Machine definition with states and transitions */
  readonly machine: MockMachineDefinition<TState, TEvent, TContext>;
  /** Simulated transition delay in ms (default: 0) */
  readonly delay?: number;
}

/**
 * Creates a mock flow service for integration testing.
 *
 * Simulates @hex-di/flow FlowService behavior:
 * - State machine with configurable transitions
 * - Tracks events sent for assertions
 * - Supports subscriptions for state observation
 * - Guards on transitions
 *
 * @example
 * ```typescript
 * const orderFlow = createMockFlowService({
 *   machine: {
 *     id: "order",
 *     initial: "idle",
 *     context: { orderId: null },
 *     states: {
 *       idle: { on: { START: "processing" } },
 *       processing: { on: { COMPLETE: "done", FAIL: "failed" } },
 *       done: { type: "final" },
 *       failed: { type: "final" },
 *     },
 *   },
 * });
 *
 * orderFlow.send("START");
 * expect(orderFlow.state()).toBe("processing");
 * ```
 */
function createMockFlowService<TState extends string, TEvent extends string, TContext>(
  config: MockFlowServiceConfig<TState, TEvent, TContext>
): MockFlowService<TState, TEvent, TContext> {
  let currentState = config.machine.initial;
  let currentContext = config.machine.context;
  let disposed = false;
  const subscribers = new Set<(snapshot: MachineSnapshot<TState, TContext>) => void>();
  const eventLog: Array<SentEvent<TEvent>> = [];

  const notifySubscribers = (): void => {
    const snap: MachineSnapshot<TState, TContext> = {
      state: currentState,
      context: currentContext,
    };
    for (const subscriber of subscribers) {
      subscriber(snap);
    }
  };

  const resolveTarget = (transitionDef: TState | TransitionConfig<TState>): TState | undefined => {
    if (typeof transitionDef === "string") {
      return transitionDef;
    }
    if (transitionDef.guard && !transitionDef.guard()) {
      return undefined;
    }
    return transitionDef.target;
  };

  const tryTransition = (
    event: TEvent,
    _payload?: unknown
  ): { success: boolean; state: TState } => {
    if (disposed) {
      return { success: false, state: currentState };
    }

    const stateConfig = config.machine.states[currentState];
    if (!stateConfig?.on) {
      return { success: false, state: currentState };
    }

    const transitionDef = stateConfig.on[event];
    if (transitionDef === undefined) {
      return { success: false, state: currentState };
    }

    const targetState = resolveTarget(transitionDef);
    if (targetState === undefined) {
      return { success: false, state: currentState };
    }

    // Validate that the target state exists in the machine definition
    if (!(targetState in config.machine.states)) {
      return { success: false, state: currentState };
    }

    const prevState = currentState;
    currentState = targetState;

    eventLog.push({
      event,
      payload: _payload,
      timestamp: Date.now(),
      prevState,
      nextState: currentState,
      transitioned: true,
    });

    notifySubscribers();
    return { success: true, state: currentState };
  };

  const service: MockFlowService<TState, TEvent, TContext> = {
    snapshot() {
      return { state: currentState, context: currentContext };
    },

    state() {
      return currentState;
    },

    context() {
      return currentContext;
    },

    send(event: TEvent, payload?: unknown) {
      const prevState = currentState;
      const result = tryTransition(event, payload);
      if (!result.success) {
        eventLog.push({
          event,
          payload,
          timestamp: Date.now(),
          prevState,
          nextState: prevState,
          transitioned: false,
        });
      }
      return result;
    },

    async sendAndExecute(event: TEvent, payload?: unknown) {
      const delay = config.delay ?? 0;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return service.send(event, payload);
    },

    subscribe(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): Unsubscribe {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    get isDisposed() {
      return disposed;
    },

    dispose(): Promise<void> {
      disposed = true;
      subscribers.clear();
      return Promise.resolve();
    },

    get sentEvents() {
      return [...eventLog];
    },

    setContext(updater: (current: TContext) => TContext) {
      currentContext = updater(currentContext);
      notifySubscribers();
    },

    forceState(state: TState) {
      const prevState = currentState;
      currentState = state;
      eventLog.push({
        event: "__FORCE__",
        timestamp: Date.now(),
        prevState,
        nextState: state,
        transitioned: true,
      });
      notifySubscribers();
    },

    reset() {
      currentState = config.machine.initial;
      currentContext = config.machine.context;
      disposed = false;
      eventLog.length = 0;
      subscribers.clear();
    },
  };

  return service;
}

// ---------------------------------------------------------------------------
// MockFlowAdapter (simplified adapter wrapper)
// ---------------------------------------------------------------------------

/** Configuration for a mock flow adapter */
interface MockFlowAdapterConfig<TState extends string, TEvent extends string, TContext> {
  /** Port name this adapter provides */
  readonly portName: string;
  /** Machine definition */
  readonly machine: MockMachineDefinition<TState, TEvent, TContext>;
  /** Simulated transition delay in ms (default: 0) */
  readonly delay?: number;
}

/** A mock flow adapter that wraps a MockFlowService */
interface MockFlowAdapter<TState extends string, TEvent extends string, TContext> {
  /** The port name this adapter provides */
  readonly portName: string;
  /** The underlying mock service */
  readonly service: MockFlowService<TState, TEvent, TContext>;
  /** Machine metadata for introspection */
  readonly metadata: {
    readonly machineId: string;
    readonly stateNames: readonly string[];
    readonly initialState: string;
  };
}

/**
 * Creates a mock flow adapter for integration testing.
 *
 * Wraps a MockFlowService with adapter metadata for graph-level integration.
 *
 * @example
 * ```typescript
 * const adapter = createMockFlowAdapter({
 *   portName: "OrderFlow",
 *   machine: orderMachine,
 * });
 *
 * adapter.service.send("START");
 * expect(adapter.metadata.machineId).toBe("order");
 * ```
 */
function createMockFlowAdapter<TState extends string, TEvent extends string, TContext>(
  config: MockFlowAdapterConfig<TState, TEvent, TContext>
): MockFlowAdapter<TState, TEvent, TContext> {
  const service = createMockFlowService({
    machine: config.machine,
    delay: config.delay,
  });

  const stateNames = Object.keys(config.machine.states);

  return {
    portName: config.portName,
    service,
    metadata: {
      machineId: config.machine.id,
      stateNames,
      initialState: config.machine.initial,
    },
  };
}

export { createMockFlowService, createMockFlowAdapter };

export type {
  MachineSnapshot,
  TransitionConfig,
  MockMachineDefinition,
  SentEvent,
  MockFlowService,
  MockFlowServiceConfig,
  MockFlowAdapterConfig,
  MockFlowAdapter,
};
