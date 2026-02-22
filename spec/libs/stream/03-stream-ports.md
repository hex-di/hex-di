# 03 - Stream Ports

## 12. createStreamPort

The `createStreamPort` factory creates stream port definitions using the curried generics pattern established throughout HexDI. Type parameters are explicit in the first call; configuration is inferred in the second call.

### Factory Signature

```typescript
function createStreamPort<T, E = never>(): <const TName extends string>(
  config: StreamPortConfig<T, E, TName>
) => StreamPort<T, E, TName>;
```

### StreamPortConfig

```typescript
interface StreamPortConfig<T, E, TName extends string> {
  /** Unique name -- becomes the port identifier */
  readonly name: TName;

  /** Optional human-readable description */
  readonly description?: string;

  /** Optional category for grouping in introspection */
  readonly category?: string;

  /** Optional tags for filtering in introspection */
  readonly tags?: readonly string[];
}
```

### Why Curried Generics

The two-stage call separates concerns:

1. **First call** -- explicit type parameters that TypeScript cannot infer: the data type and error type
2. **Second call** -- configuration that TypeScript can infer: the name literal, description, tags

```typescript
//        Stage 1: explicit types   Stage 2: inferred config
//        vvvvvvvvvvvvvvvvvvvvvvvv  vvvvvvvvvvvvvvvvvvvvvvvvvvvv
const P = createStreamPort<number>()({ name: "PriceTicker" });
//                                  ^^
//                         curried boundary
```

### Examples

```typescript
// Simple stream -- no recoverable errors
const PriceTickerPort = createStreamPort<PriceTick>()({
  name: "PriceTicker",
  description: "Real-time price ticker from exchange",
  category: "market-data",
});

// Stream with typed recoverable errors
const NotificationPort = createStreamPort<Notification, NotificationError>()({
  name: "Notifications",
  tags: ["push", "user-facing"],
});

// Stream of container events
const AuditLogPort = createStreamPort<AuditEvent>()({
  name: "AuditLog",
  category: "observability",
});
```

## 13. StreamPort Type Definition

A `StreamPort` is a `DirectedPort<StreamProducer<T, E>, TName, "inbound">` with phantom types for type-safe extraction. The port carries the producer function type directly.

**Port Direction:** `StreamPort` uses `"inbound"` direction. The application resolves a stream producer -- data flows inward from infrastructure to domain.

### Type Definition

```typescript
declare const STREAM_PORT_SYMBOL: unique symbol;
declare const __streamData: unique symbol;
declare const __streamError: unique symbol;

interface StreamPort<T, E = never, TName extends string = string> extends DirectedPort<
  StreamProducer<T, E>,
  TName,
  "inbound"
> {
  /** Phantom: compile-time data type */
  readonly [__streamData]: T;

  /** Phantom: compile-time error type */
  readonly [__streamError]: E;

  /**
   * Runtime brand: identifies this as a StreamPort.
   *
   * Design note: The phantom `__streamData` and `__streamError` symbols are
   * redundant with the service type in `DirectedPort<StreamProducer<T, E>, ...>`.
   * They are retained for ergonomic inference -- `InferStreamData<P>` extracts `T`
   * directly without unwrapping the `StreamProducer` thunk. This matches the query
   * spec's approach where `__queryErrorType` provides direct error extraction.
   */
  readonly [STREAM_PORT_SYMBOL]: true;

  /** Stream-specific configuration */
  readonly config: StreamPortConfig<T, E, TName>;
}

/** Convenience alias for stream ports with erased type parameters */
type AnyStreamPort = StreamPort<unknown, unknown, string>;
```

### StreamProducer

The service type resolved by `StreamPort`. A thunk that creates a new stream on each call (cold semantics):

```typescript
type StreamProducer<T, E = never> = () => Stream<T, E>;
```

For hot streams, the adapter returns the same shared stream instance from the thunk. For cold streams, each invocation creates a fresh stream.

### Relationship to DirectedPort

```typescript
// StreamPort IS a DirectedPort, not a wrapper around one
type AssertStreamIsDirected =
  StreamPort<number, never, "Ticker"> extends DirectedPort<
    StreamProducer<number, never>,
    "Ticker",
    "inbound"
  >
    ? true
    : never;

// Stream ports participate in GraphBuilder validation
const graph = GraphBuilder.create()
  .provide(WsPriceAdapter) // Provides PriceTickerPort
  .build();
// If WsPriceAdapter is missing, TypeScript reports a compile-time error
```

## 14. SubjectPort

A `SubjectPort` resolves to the subject itself (not a producer function), so consumers can both subscribe and push:

```typescript
declare const SUBJECT_PORT_SYMBOL: unique symbol;
declare const __subjectData: unique symbol;
declare const __subjectError: unique symbol;

interface SubjectPort<T, E = never, TName extends string = string> extends DirectedPort<
  Subject<T, E>,
  TName,
  "inbound"
> {
  readonly [__subjectData]: T;
  readonly [__subjectError]: E;
  readonly [SUBJECT_PORT_SYMBOL]: true;
  readonly config: SubjectPortConfig<T, E, TName>;
}
```

### createSubjectPort Factory

```typescript
function createSubjectPort<T, E = never>(): <const TName extends string>(
  config: SubjectPortConfig<T, E, TName>
) => SubjectPort<T, E, TName>;

interface SubjectPortConfig<T, E, TName extends string> {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}
```

### Example

```typescript
const EventBusPort = createSubjectPort<AppEvent>()({
  name: "EventBus",
  description: "Application-wide event bus",
});

// Consumer side: subscribe
const subject = container.resolve(EventBusPort);
subject.subscribe({ next: event => handleEvent(event) });

// Producer side: push
subject.next({ type: "user-logged-in", userId: "123" });
```

## 15. OperatorPort

An `OperatorPort` enables stream operators to be resolved from DI, making processing pipelines swappable:

```typescript
declare const OPERATOR_PORT_SYMBOL: unique symbol;

interface OperatorPort<TIn, EIn, TOut, EOut, TName extends string = string> extends DirectedPort<
  Operator<TIn, EIn, TOut, EOut>,
  TName,
  "inbound"
> {
  readonly [OPERATOR_PORT_SYMBOL]: true;
  readonly config: OperatorPortConfig<TIn, EIn, TOut, EOut, TName>;
}
```

### createOperatorPort Factory

```typescript
function createOperatorPort<TIn, EIn = never, TOut = TIn, EOut = EIn>(): <
  const TName extends string,
>(
  config: OperatorPortConfig<TIn, EIn, TOut, EOut, TName>
) => OperatorPort<TIn, EIn, TOut, EOut, TName>;

interface OperatorPortConfig<TIn, EIn, TOut, EOut, TName extends string> {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}
```

### Example

```typescript
// Operator port -- the "data enrichment" transform is swappable via DI
const EnrichPricePort = createOperatorPort<PriceTick, never, EnrichedTick>()({
  name: "EnrichPrice",
  description: "Enriches raw ticks with market metadata",
});

// Production adapter
const ProdEnrichAdapter = createOperatorAdapter({
  provides: EnrichPricePort,
  requires: [MarketMetadataPort],
  factory:
    ({ metadata }) =>
    source =>
      source.pipe(map(tick => ({ ...tick, market: metadata.getMarket(tick.symbol) }))),
});

// Test adapter -- no external dependency
const TestEnrichAdapter = createOperatorAdapter({
  provides: EnrichPricePort,
  factory: () => source => source.pipe(map(tick => ({ ...tick, market: "TEST" }))),
});

// Usage -- operator resolved from DI
const enrichOp = container.resolve(EnrichPricePort);
const enrichedStream = rawPrices.pipe(enrichOp);
```

## 16. Type Guards

Runtime type guards checking the respective brand symbols:

```typescript
function isStreamPort(value: unknown): value is StreamPort {
  return (
    typeof value === "object" &&
    value !== null &&
    STREAM_PORT_SYMBOL in value &&
    value[STREAM_PORT_SYMBOL] === true
  );
}

function isSubjectPort(value: unknown): value is SubjectPort {
  return (
    typeof value === "object" &&
    value !== null &&
    SUBJECT_PORT_SYMBOL in value &&
    value[SUBJECT_PORT_SYMBOL] === true
  );
}

function isOperatorPort(value: unknown): value is OperatorPort {
  return (
    typeof value === "object" &&
    value !== null &&
    OPERATOR_PORT_SYMBOL in value &&
    value[OPERATOR_PORT_SYMBOL] === true
  );
}
```

## 17. Type Inference Utilities

Utility types extract phantom type information from stream ports. Following the established `InferenceError` pattern from `@hex-di/core`, all inference utilities return structured branded error types when given a non-port input.

```typescript
/** Extract the data type from a StreamPort */
type InferStreamData<T> = [T] extends [StreamPort<infer TData, unknown, string>]
  ? TData
  : InferenceError<
      "InferStreamData",
      "Expected a StreamPort type. Use InferStreamData<typeof YourPort>.",
      T
    >;

/** Extract the error type from a StreamPort */
type InferStreamError<T> = [T] extends [StreamPort<unknown, infer TError, string>]
  ? TError
  : InferenceError<
      "InferStreamError",
      "Expected a StreamPort type. Use InferStreamError<typeof YourPort>.",
      T
    >;

/** Extract the name literal type from a StreamPort */
type InferStreamName<T> = [T] extends [StreamPort<unknown, unknown, infer TName>]
  ? TName
  : InferenceError<
      "InferStreamName",
      "Expected a StreamPort type. Use InferStreamName<typeof YourPort>.",
      T
    >;

/** Extract all types from a StreamPort at once */
type InferStreamTypes<T> = [T] extends [StreamPort<infer TData, infer TError, infer TName>]
  ? {
      readonly name: TName;
      readonly data: TData;
      readonly error: TError;
    }
  : InferenceError<
      "InferStreamTypes",
      "Expected a StreamPort type. Use InferStreamTypes<typeof YourPort>.",
      T
    >;

/** Extract data type from a SubjectPort */
type InferSubjectData<T> = [T] extends [SubjectPort<infer TData, unknown, string>]
  ? TData
  : InferenceError<"InferSubjectData", "Expected a SubjectPort type.", T>;

/** Extract error type from a SubjectPort */
type InferSubjectError<T> = [T] extends [SubjectPort<unknown, infer TError, string>]
  ? TError
  : InferenceError<"InferSubjectError", "Expected a SubjectPort type.", T>;

/** Extract the input data type from an OperatorPort */
type InferOperatorInput<T> = [T] extends [
  OperatorPort<infer TIn, unknown, unknown, unknown, string>,
]
  ? TIn
  : InferenceError<
      "InferOperatorInput",
      "Expected an OperatorPort type. Use InferOperatorInput<typeof YourPort>.",
      T
    >;

/** Extract the output data type from an OperatorPort */
type InferOperatorOutput<T> = [T] extends [
  OperatorPort<unknown, unknown, infer TOut, unknown, string>,
]
  ? TOut
  : InferenceError<
      "InferOperatorOutput",
      "Expected an OperatorPort type. Use InferOperatorOutput<typeof YourPort>.",
      T
    >;

/** Extract the input error type from an OperatorPort */
type InferOperatorInputError<T> = [T] extends [
  OperatorPort<unknown, infer EIn, unknown, unknown, string>,
]
  ? EIn
  : InferenceError<
      "InferOperatorInputError",
      "Expected an OperatorPort type. Use InferOperatorInputError<typeof YourPort>.",
      T
    >;

/** Extract the output error type from an OperatorPort */
type InferOperatorOutputError<T> = [T] extends [
  OperatorPort<unknown, unknown, unknown, infer EOut, string>,
]
  ? EOut
  : InferenceError<
      "InferOperatorOutputError",
      "Expected an OperatorPort type. Use InferOperatorOutputError<typeof YourPort>.",
      T
    >;
```

### Usage

```typescript
const TickerPort = createStreamPort<PriceTick, PriceError>()({
  name: "PriceTicker",
});

type Data = InferStreamData<typeof TickerPort>; // PriceTick
type Err = InferStreamError<typeof TickerPort>; // PriceError
type Name = InferStreamName<typeof TickerPort>; // "PriceTicker"
type Types = InferStreamTypes<typeof TickerPort>;
// { readonly name: "PriceTicker"; readonly data: PriceTick; readonly error: PriceError }
```

---

_Previous: [02 - Core Concepts](./02-core-concepts.md)_

_Next: [04 - Stream Adapters](./04-stream-adapters.md)_
