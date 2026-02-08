/**
 * Test graph builder helpers for cross-library integration testing.
 * Provides pre-configured adapter sets for common integration test scenarios.
 *
 * Each builder creates a set of mock adapters wired together for a specific
 * cross-library integration pattern. The returned object contains individual
 * adapters for direct access and a `build()` method that returns them all
 * as a bundle.
 */

import {
  createInMemoryStateAdapter,
  type InMemoryStateService,
  type ActionMap,
} from "../mock-adapters/store.js";
import {
  createFakeQueryAdapter,
  createFakeMutationAdapter,
  createFakeQueryClientAdapter,
  type FakeQueryService,
  type FakeMutationService,
  type FakeQueryClientService,
} from "../mock-adapters/query.js";
import {
  createMockFlowService,
  type MockFlowService,
  type MockMachineDefinition,
} from "../mock-adapters/flow.js";
import {
  createFakeSagaAdapter,
  createFakeSagaManagementAdapter,
  type FakeSagaService,
  type FakeSagaManagementService,
  type FakeSagaStep,
} from "../mock-adapters/saga.js";

// ---------------------------------------------------------------------------
// Store + Query test graph
// ---------------------------------------------------------------------------

/** Configuration for a store+query test graph */
interface StoreQueryTestGraphConfig<
  TState,
  TActions extends ActionMap<TState>,
  TQueryData,
  _TQueryParams,
  TMutationData,
  _TMutationInput,
> {
  readonly store: {
    readonly name: string;
    readonly initial: TState;
    readonly actions: TActions;
  };
  readonly query: {
    readonly name: string;
    readonly data?: TQueryData;
  };
  readonly mutation?: {
    readonly name: string;
    readonly data?: TMutationData;
  };
}

/** Store+query test graph result */
interface StoreQueryTestGraph<
  TState,
  TActions extends ActionMap<TState>,
  TQueryData,
  TQueryParams,
  TMutationData,
  TMutationInput,
> {
  readonly store: InMemoryStateService<TState, TActions>;
  readonly query: FakeQueryService<TQueryData, TQueryParams, Error>;
  readonly mutation: FakeMutationService<TMutationData, TMutationInput, Error> | undefined;
  readonly queryClient: FakeQueryClientService;
  /** Reset all adapters to initial state */
  reset(): void;
}

/**
 * Creates a pre-wired store + query adapter set for testing scenarios where
 * state management interacts with data fetching/mutations.
 *
 * @example
 * ```typescript
 * const graph = createStoreQueryTestGraph({
 *   store: {
 *     name: "Users",
 *     initial: { users: [], loading: false },
 *     actions: {
 *       setUsers: (state, users: User[]) => ({ ...state, users }),
 *       setLoading: (state, loading: boolean) => ({ ...state, loading }),
 *     },
 *   },
 *   query: { name: "FetchUsers", data: [{ id: "1", name: "Alice" }] },
 *   mutation: { name: "CreateUser", data: { id: "2", name: "Bob" } },
 * });
 * ```
 */
function createStoreQueryTestGraph<
  TState,
  TActions extends ActionMap<TState>,
  TQueryData = unknown,
  TQueryParams = void,
  TMutationData = unknown,
  TMutationInput = void,
>(
  config: StoreQueryTestGraphConfig<
    TState,
    TActions,
    TQueryData,
    TQueryParams,
    TMutationData,
    TMutationInput
  >
): StoreQueryTestGraph<TState, TActions, TQueryData, TQueryParams, TMutationData, TMutationInput> {
  const store = createInMemoryStateAdapter({
    name: config.store.name,
    initial: config.store.initial,
    actions: config.store.actions,
  });

  const query = createFakeQueryAdapter<TQueryData, TQueryParams>({
    name: config.query.name,
    data: config.query.data,
  });

  const mutation = config.mutation
    ? createFakeMutationAdapter<TMutationData, TMutationInput>({
        name: config.mutation.name,
        data: config.mutation.data,
      })
    : undefined;

  const queryClient = createFakeQueryClientAdapter();

  return {
    store,
    query,
    mutation,
    queryClient,
    reset() {
      store.reset();
      query.reset();
      mutation?.reset();
      queryClient.reset();
    },
  };
}

// ---------------------------------------------------------------------------
// Flow + Saga test graph
// ---------------------------------------------------------------------------

/** Configuration for a flow+saga test graph */
interface FlowSagaTestGraphConfig<
  TState extends string,
  TEvent extends string,
  TContext,
  _TSagaInput,
  TSagaOutput,
  _TSagaError,
> {
  readonly flow: {
    readonly machine: MockMachineDefinition<TState, TEvent, TContext>;
  };
  readonly saga: {
    readonly name: string;
    readonly steps: readonly FakeSagaStep[];
    readonly output?: TSagaOutput;
  };
}

/** Flow+saga test graph result */
interface FlowSagaTestGraph<
  TState extends string,
  TEvent extends string,
  TContext,
  TSagaInput,
  TSagaOutput,
  TSagaError,
> {
  readonly flow: MockFlowService<TState, TEvent, TContext>;
  readonly saga: FakeSagaService<TSagaInput, TSagaOutput, TSagaError>;
  readonly sagaManagement: FakeSagaManagementService;
  reset(): void;
}

/**
 * Creates a pre-wired flow + saga adapter set for testing scenarios where
 * state machines coordinate with saga orchestration.
 */
function createFlowSagaTestGraph<
  TState extends string,
  TEvent extends string,
  TContext,
  TSagaInput = unknown,
  TSagaOutput = unknown,
  TSagaError = never,
>(
  config: FlowSagaTestGraphConfig<TState, TEvent, TContext, TSagaInput, TSagaOutput, TSagaError>
): FlowSagaTestGraph<TState, TEvent, TContext, TSagaInput, TSagaOutput, TSagaError> {
  const flow = createMockFlowService({ machine: config.flow.machine });

  const saga = createFakeSagaAdapter<TSagaInput, TSagaOutput, TSagaError>({
    name: config.saga.name,
    steps: config.saga.steps,
    output: config.saga.output,
  });

  const sagaManagement = createFakeSagaManagementAdapter({ name: `${config.saga.name}Management` });

  return {
    flow,
    saga,
    sagaManagement,
    reset() {
      flow.reset();
      saga.reset();
      sagaManagement.reset();
    },
  };
}

// ---------------------------------------------------------------------------
// Store + Flow test graph
// ---------------------------------------------------------------------------

/** Configuration for a store+flow test graph */
interface StoreFlowTestGraphConfig<
  TState,
  TActions extends ActionMap<TState>,
  TFlowState extends string,
  TFlowEvent extends string,
  TFlowContext,
> {
  readonly store: {
    readonly name: string;
    readonly initial: TState;
    readonly actions: TActions;
  };
  readonly flow: {
    readonly machine: MockMachineDefinition<TFlowState, TFlowEvent, TFlowContext>;
  };
}

/** Store+flow test graph result */
interface StoreFlowTestGraph<
  TState,
  TActions extends ActionMap<TState>,
  TFlowState extends string,
  TFlowEvent extends string,
  TFlowContext,
> {
  readonly store: InMemoryStateService<TState, TActions>;
  readonly flow: MockFlowService<TFlowState, TFlowEvent, TFlowContext>;
  reset(): void;
}

/**
 * Creates a pre-wired store + flow adapter set for testing scenarios where
 * state management reacts to state machine transitions.
 */
function createStoreFlowTestGraph<
  TState,
  TActions extends ActionMap<TState>,
  TFlowState extends string,
  TFlowEvent extends string,
  TFlowContext,
>(
  config: StoreFlowTestGraphConfig<TState, TActions, TFlowState, TFlowEvent, TFlowContext>
): StoreFlowTestGraph<TState, TActions, TFlowState, TFlowEvent, TFlowContext> {
  const store = createInMemoryStateAdapter({
    name: config.store.name,
    initial: config.store.initial,
    actions: config.store.actions,
  });

  const flow = createMockFlowService({ machine: config.flow.machine });

  return {
    store,
    flow,
    reset() {
      store.reset();
      flow.reset();
    },
  };
}

// ---------------------------------------------------------------------------
// Store + Saga test graph
// ---------------------------------------------------------------------------

/** Configuration for a store+saga test graph */
interface StoreSagaTestGraphConfig<
  TState,
  TActions extends ActionMap<TState>,
  _TSagaInput,
  TSagaOutput,
  _TSagaError,
> {
  readonly store: {
    readonly name: string;
    readonly initial: TState;
    readonly actions: TActions;
  };
  readonly saga: {
    readonly name: string;
    readonly steps: readonly FakeSagaStep[];
    readonly output?: TSagaOutput;
  };
}

/** Store+saga test graph result */
interface StoreSagaTestGraph<
  TState,
  TActions extends ActionMap<TState>,
  TSagaInput,
  TSagaOutput,
  TSagaError,
> {
  readonly store: InMemoryStateService<TState, TActions>;
  readonly saga: FakeSagaService<TSagaInput, TSagaOutput, TSagaError>;
  readonly sagaManagement: FakeSagaManagementService;
  reset(): void;
}

/**
 * Creates a pre-wired store + saga adapter set for testing scenarios where
 * state management coordinates with saga orchestration.
 */
function createStoreSagaTestGraph<
  TState,
  TActions extends ActionMap<TState>,
  TSagaInput = unknown,
  TSagaOutput = unknown,
  TSagaError = never,
>(
  config: StoreSagaTestGraphConfig<TState, TActions, TSagaInput, TSagaOutput, TSagaError>
): StoreSagaTestGraph<TState, TActions, TSagaInput, TSagaOutput, TSagaError> {
  const store = createInMemoryStateAdapter({
    name: config.store.name,
    initial: config.store.initial,
    actions: config.store.actions,
  });

  const saga = createFakeSagaAdapter<TSagaInput, TSagaOutput, TSagaError>({
    name: config.saga.name,
    steps: config.saga.steps,
    output: config.saga.output,
  });

  const sagaManagement = createFakeSagaManagementAdapter({ name: `${config.saga.name}Management` });

  return {
    store,
    saga,
    sagaManagement,
    reset() {
      store.reset();
      saga.reset();
      sagaManagement.reset();
    },
  };
}

// ---------------------------------------------------------------------------
// Query + Saga test graph
// ---------------------------------------------------------------------------

/** Configuration for a query+saga test graph */
interface QuerySagaTestGraphConfig<
  TQueryData,
  _TQueryParams,
  _TSagaInput,
  TSagaOutput,
  _TSagaError,
> {
  readonly query: {
    readonly name: string;
    readonly data?: TQueryData;
  };
  readonly saga: {
    readonly name: string;
    readonly steps: readonly FakeSagaStep[];
    readonly output?: TSagaOutput;
  };
}

/** Query+saga test graph result */
interface QuerySagaTestGraph<TQueryData, TQueryParams, TSagaInput, TSagaOutput, TSagaError> {
  readonly query: FakeQueryService<TQueryData, TQueryParams, Error>;
  readonly queryClient: FakeQueryClientService;
  readonly saga: FakeSagaService<TSagaInput, TSagaOutput, TSagaError>;
  readonly sagaManagement: FakeSagaManagementService;
  reset(): void;
}

/**
 * Creates a pre-wired query + saga adapter set for testing scenarios where
 * data fetching interacts with saga orchestration.
 */
function createQuerySagaTestGraph<
  TQueryData = unknown,
  TQueryParams = void,
  TSagaInput = unknown,
  TSagaOutput = unknown,
  TSagaError = never,
>(
  config: QuerySagaTestGraphConfig<TQueryData, TQueryParams, TSagaInput, TSagaOutput, TSagaError>
): QuerySagaTestGraph<TQueryData, TQueryParams, TSagaInput, TSagaOutput, TSagaError> {
  const query = createFakeQueryAdapter<TQueryData, TQueryParams>({
    name: config.query.name,
    data: config.query.data,
  });

  const queryClient = createFakeQueryClientAdapter();

  const saga = createFakeSagaAdapter<TSagaInput, TSagaOutput, TSagaError>({
    name: config.saga.name,
    steps: config.saga.steps,
    output: config.saga.output,
  });

  const sagaManagement = createFakeSagaManagementAdapter({ name: `${config.saga.name}Management` });

  return {
    query,
    queryClient,
    saga,
    sagaManagement,
    reset() {
      query.reset();
      queryClient.reset();
      saga.reset();
      sagaManagement.reset();
    },
  };
}

// ---------------------------------------------------------------------------
// Query + Flow test graph
// ---------------------------------------------------------------------------

/** Configuration for a query+flow test graph */
interface QueryFlowTestGraphConfig<
  TQueryData,
  _TQueryParams,
  TFlowState extends string,
  TFlowEvent extends string,
  TFlowContext,
> {
  readonly query: {
    readonly name: string;
    readonly data?: TQueryData;
  };
  readonly flow: {
    readonly machine: MockMachineDefinition<TFlowState, TFlowEvent, TFlowContext>;
  };
}

/** Query+flow test graph result */
interface QueryFlowTestGraph<
  TQueryData,
  TQueryParams,
  TFlowState extends string,
  TFlowEvent extends string,
  TFlowContext,
> {
  readonly query: FakeQueryService<TQueryData, TQueryParams, Error>;
  readonly queryClient: FakeQueryClientService;
  readonly flow: MockFlowService<TFlowState, TFlowEvent, TFlowContext>;
  reset(): void;
}

/**
 * Creates a pre-wired query + flow adapter set for testing scenarios where
 * data fetching interacts with state machine transitions.
 */
function createQueryFlowTestGraph<
  TQueryData = unknown,
  TQueryParams = void,
  TFlowState extends string = string,
  TFlowEvent extends string = string,
  TFlowContext = unknown,
>(
  config: QueryFlowTestGraphConfig<TQueryData, TQueryParams, TFlowState, TFlowEvent, TFlowContext>
): QueryFlowTestGraph<TQueryData, TQueryParams, TFlowState, TFlowEvent, TFlowContext> {
  const query = createFakeQueryAdapter<TQueryData, TQueryParams>({
    name: config.query.name,
    data: config.query.data,
  });

  const queryClient = createFakeQueryClientAdapter();

  const flow = createMockFlowService({ machine: config.flow.machine });

  return {
    query,
    queryClient,
    flow,
    reset() {
      query.reset();
      queryClient.reset();
      flow.reset();
    },
  };
}

export {
  createStoreQueryTestGraph,
  createFlowSagaTestGraph,
  createStoreFlowTestGraph,
  createStoreSagaTestGraph,
  createQuerySagaTestGraph,
  createQueryFlowTestGraph,
};

export type {
  StoreQueryTestGraphConfig,
  StoreQueryTestGraph,
  FlowSagaTestGraphConfig,
  FlowSagaTestGraph,
  StoreFlowTestGraphConfig,
  StoreFlowTestGraph,
  StoreSagaTestGraphConfig,
  StoreSagaTestGraph,
  QuerySagaTestGraphConfig,
  QuerySagaTestGraph,
  QueryFlowTestGraphConfig,
  QueryFlowTestGraph,
};
