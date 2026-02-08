/**
 * Fake query, mutation, and query client adapters for integration testing.
 *
 * Simulates @hex-di/query behavior without requiring the actual package.
 * These are pure TypeScript implementations that mirror the spec'd API surface.
 *
 * When @hex-di/query is implemented, the type stubs should be replaced with
 * imports from "@hex-di/query".
 */

// ---------------------------------------------------------------------------
// Type stubs (will come from @hex-di/query when implemented)
// ---------------------------------------------------------------------------

/** Query status */
type QueryStatus = "idle" | "loading" | "success" | "error";

/** Query state snapshot */
interface QueryState<TData, TError> {
  readonly status: QueryStatus;
  readonly data: TData | undefined;
  readonly error: TError | undefined;
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly isStale: boolean;
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
}

/** Unsubscribe function */
type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// FakeQueryAdapter
// ---------------------------------------------------------------------------

/** A single query result entry in a sequence */
interface QueryResultEntry<TData, TError> {
  readonly data?: TData;
  readonly error?: TError;
  readonly delay?: number;
}

/** Configuration for creating a fake query adapter */
interface FakeQueryAdapterConfig<TData, TError = Error> {
  /** Display name for the query */
  readonly name: string;
  /** Fixed data to return (use this or sequence, not both) */
  readonly data?: TData;
  /** Fixed error to return */
  readonly error?: TError;
  /** Sequence of results to return in order (cycles back to last on exhaustion) */
  readonly sequence?: ReadonlyArray<QueryResultEntry<TData, TError>>;
  /** Simulated fetch delay in ms (default: 0) */
  readonly delay?: number;
}

/** Record of a fetch call for test assertions */
interface FetchCall<TParams> {
  readonly params: TParams;
  readonly timestamp: number;
}

/** The fake query service */
interface FakeQueryService<TData, TParams, TError> {
  /** Execute a query fetch */
  fetch(params: TParams): Promise<TData>;
  /** Current query state */
  readonly state: QueryState<TData, TError>;
  /** Subscribe to state changes */
  subscribe(callback: (state: QueryState<TData, TError>) => void): Unsubscribe;
  /** All recorded fetch calls */
  readonly fetchCalls: ReadonlyArray<FetchCall<TParams>>;
  /** Reset the adapter state and call history */
  reset(): void;
  /** Override the next result (one-shot) */
  setNextResult(result: QueryResultEntry<TData, TError>): void;
}

/**
 * Creates a fake query adapter for integration testing.
 *
 * Simulates @hex-di/query QueryPort behavior:
 * - Returns fixed data or sequences of results
 * - Tracks fetch calls for assertions
 * - Supports subscriptions for state observation
 *
 * @example
 * ```typescript
 * const usersQuery = createFakeQueryAdapter<User[], void>({
 *   name: "Users",
 *   data: [{ id: "1", name: "Alice" }],
 * });
 *
 * const result = await usersQuery.fetch(undefined);
 * expect(result).toEqual([{ id: "1", name: "Alice" }]);
 * expect(usersQuery.fetchCalls).toHaveLength(1);
 * ```
 */
function createFakeQueryAdapter<TData, TParams = void, TError = Error>(
  config: FakeQueryAdapterConfig<TData, TError>
): FakeQueryService<TData, TParams, TError> {
  let sequenceIndex = 0;
  let nextOverride: QueryResultEntry<TData, TError> | undefined;
  const fetchCallLog: Array<FetchCall<TParams>> = [];
  const subscribers = new Set<(state: QueryState<TData, TError>) => void>();

  let currentState: QueryState<TData, TError> = {
    status: "idle",
    data: undefined,
    error: undefined,
    isLoading: false,
    isFetching: false,
    isStale: false,
    dataUpdatedAt: undefined,
    errorUpdatedAt: undefined,
  };

  const notifySubscribers = (): void => {
    for (const subscriber of subscribers) {
      subscriber(currentState);
    }
  };

  const setState = (update: Partial<QueryState<TData, TError>>): void => {
    currentState = { ...currentState, ...update };
    notifySubscribers();
  };

  const getNextResult = (): QueryResultEntry<TData, TError> => {
    if (nextOverride) {
      const override = nextOverride;
      nextOverride = undefined;
      return override;
    }

    if (config.sequence && config.sequence.length > 0) {
      const entry = config.sequence[Math.min(sequenceIndex, config.sequence.length - 1)];
      sequenceIndex++;
      return entry;
    }

    if (config.error !== undefined) {
      return { error: config.error };
    }

    return { data: config.data };
  };

  const service: FakeQueryService<TData, TParams, TError> = {
    async fetch(params: TParams): Promise<TData> {
      fetchCallLog.push({ params, timestamp: Date.now() });

      setState({
        status: "loading",
        isLoading: true,
        isFetching: true,
      });

      const result = getNextResult();
      const delay = result.delay ?? config.delay ?? 0;

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (result.error !== undefined) {
        setState({
          status: "error",
          error: result.error,
          isLoading: false,
          isFetching: false,
          errorUpdatedAt: Date.now(),
        });
        throw result.error;
      }

      const now = Date.now();
      setState({
        status: "success",
        data: result.data,
        error: undefined,
        isLoading: false,
        isFetching: false,
        isStale: false,
        dataUpdatedAt: now,
      });

      // Safe: we know data is defined since error was not set
      return result.data as TData;
    },

    get state() {
      return currentState;
    },

    subscribe(callback: (state: QueryState<TData, TError>) => void): Unsubscribe {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    get fetchCalls() {
      return [...fetchCallLog];
    },

    reset(): void {
      sequenceIndex = 0;
      nextOverride = undefined;
      fetchCallLog.length = 0;
      subscribers.clear();
      currentState = {
        status: "idle",
        data: undefined,
        error: undefined,
        isLoading: false,
        isFetching: false,
        isStale: false,
        dataUpdatedAt: undefined,
        errorUpdatedAt: undefined,
      };
    },

    setNextResult(result: QueryResultEntry<TData, TError>): void {
      nextOverride = result;
    },
  };

  return service;
}

// ---------------------------------------------------------------------------
// FakeMutationAdapter
// ---------------------------------------------------------------------------

/** Configuration for creating a fake mutation adapter */
interface FakeMutationAdapterConfig<TData, TError = Error> {
  /** Display name for the mutation */
  readonly name: string;
  /** Fixed data to return on success */
  readonly data?: TData;
  /** Fixed error to return (makes the mutation always fail) */
  readonly error?: TError;
  /** Simulated execution delay in ms (default: 0) */
  readonly delay?: number;
}

/** Record of a mutation call for test assertions */
interface MutationCall<TInput> {
  readonly input: TInput;
  readonly timestamp: number;
}

/** The fake mutation service */
interface FakeMutationService<TData, TInput, TError> {
  /** Execute a mutation */
  execute(input: TInput): Promise<TData>;
  /** All recorded mutation calls */
  readonly calls: ReadonlyArray<MutationCall<TInput>>;
  /** Reset the adapter state and call history */
  reset(): void;
  /** Configure the next result (one-shot) */
  setNextResult(result: { data?: TData; error?: TError }): void;
  /** Set whether the mutation should fail */
  setShouldFail(error: TError): void;
  /** Set the mutation to succeed with the given data */
  setShouldSucceed(data: TData): void;
}

/**
 * Creates a fake mutation adapter for integration testing.
 *
 * Simulates @hex-di/query MutationPort behavior:
 * - Records mutation calls for assertions
 * - Configurable success/failure responses
 *
 * @example
 * ```typescript
 * const createUser = createFakeMutationAdapter<User, CreateUserInput>({
 *   name: "CreateUser",
 *   data: { id: "1", name: "Alice" },
 * });
 *
 * const result = await createUser.execute({ name: "Alice" });
 * expect(result).toEqual({ id: "1", name: "Alice" });
 * expect(createUser.calls).toHaveLength(1);
 * ```
 */
function createFakeMutationAdapter<TData, TInput = void, TError = Error>(
  config: FakeMutationAdapterConfig<TData, TError>
): FakeMutationService<TData, TInput, TError> {
  const callLog: Array<MutationCall<TInput>> = [];
  let nextOverride: { data?: TData; error?: TError } | undefined;
  let failWith: TError | undefined = config.error;
  let succeedWith: TData | undefined = config.data;

  const service: FakeMutationService<TData, TInput, TError> = {
    async execute(input: TInput): Promise<TData> {
      callLog.push({ input, timestamp: Date.now() });

      const delay = config.delay ?? 0;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (nextOverride) {
        const override = nextOverride;
        nextOverride = undefined;
        if (override.error !== undefined) {
          throw override.error;
        }
        return override.data as TData;
      }

      if (failWith !== undefined) {
        throw failWith;
      }

      return succeedWith as TData;
    },

    get calls() {
      return [...callLog];
    },

    reset(): void {
      callLog.length = 0;
      nextOverride = undefined;
      failWith = config.error;
      succeedWith = config.data;
    },

    setNextResult(result: { data?: TData; error?: TError }): void {
      nextOverride = result;
    },

    setShouldFail(error: TError): void {
      failWith = error;
      succeedWith = undefined;
    },

    setShouldSucceed(data: TData): void {
      succeedWith = data;
      failWith = undefined;
    },
  };

  return service;
}

// ---------------------------------------------------------------------------
// FakeQueryClientAdapter
// ---------------------------------------------------------------------------

/** Record of an invalidation call for test assertions */
interface InvalidationCall {
  readonly portName: string;
  readonly params?: unknown;
  readonly timestamp: number;
}

/** The fake query client service */
interface FakeQueryClientService {
  /** Track an invalidation */
  invalidate(portName: string, params?: unknown): Promise<void>;
  /** Track invalidating all queries */
  invalidateAll(): Promise<void>;
  /** All recorded invalidation calls */
  readonly invalidations: ReadonlyArray<InvalidationCall>;
  /** Get invalidations for a specific port */
  getInvalidationsFor(portName: string): ReadonlyArray<InvalidationCall>;
  /** Reset all tracked calls */
  reset(): void;
}

/**
 * Creates a fake query client adapter for integration testing.
 *
 * Simulates @hex-di/query QueryClient behavior:
 * - Tracks invalidation calls for assertions
 * - Does not actually manage a cache
 *
 * @example
 * ```typescript
 * const queryClient = createFakeQueryClientAdapter();
 *
 * await queryClient.invalidate("Users");
 * expect(queryClient.invalidations).toHaveLength(1);
 * expect(queryClient.getInvalidationsFor("Users")).toHaveLength(1);
 * ```
 */
function createFakeQueryClientAdapter(): FakeQueryClientService {
  const invalidationLog: Array<InvalidationCall> = [];

  const service: FakeQueryClientService = {
    invalidate(portName: string, params?: unknown): Promise<void> {
      invalidationLog.push({ portName, params, timestamp: Date.now() });
      return Promise.resolve();
    },

    invalidateAll(): Promise<void> {
      invalidationLog.push({ portName: "*", timestamp: Date.now() });
      return Promise.resolve();
    },

    get invalidations() {
      return [...invalidationLog];
    },

    getInvalidationsFor(portName: string) {
      return invalidationLog.filter(i => i.portName === portName);
    },

    reset(): void {
      invalidationLog.length = 0;
    },
  };

  return service;
}

export { createFakeQueryAdapter, createFakeMutationAdapter, createFakeQueryClientAdapter };

export type {
  QueryStatus,
  QueryState,
  QueryResultEntry,
  FakeQueryAdapterConfig,
  FetchCall,
  FakeQueryService,
  FakeMutationAdapterConfig,
  MutationCall,
  FakeMutationService,
  InvalidationCall,
  FakeQueryClientService,
};
