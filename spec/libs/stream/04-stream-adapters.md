# 04 - Stream Adapters

## 18. createStreamAdapter

Creates an adapter that provides a `StreamProducer<T, E>` for a `StreamPort`. Bridges to `@hex-di/core`'s `createAdapter` internally.

### Factory Signature

```typescript
function createStreamAdapter<
  T,
  E,
  TName extends string,
  const TRequires extends ReadonlyArray<Port<unknown, string>> = [],
  TLifetime extends Lifetime = "scoped",
>(
  config: StreamAdapterConfig<T, E, TName, TRequires, TLifetime>
): Result<Adapter<StreamPort<T, E, TName>, TRequires, TLifetime, "sync">, StreamAdapterError>;
```

> **Design note:** Stream adapter factories return `Result<Adapter, StreamAdapterError>` to surface configuration errors (e.g., invalid port type, missing required config) at adapter creation time rather than at container resolution time. This is consistent with `@hex-di/core`'s `createAdapter` which also returns a Result. The query and store specs show unwrapped usage in examples for brevity -- the Result wrapping exists but is elided in quick-start examples.

### StreamAdapterConfig

```typescript
interface StreamAdapterConfig<
  T,
  E,
  TName extends string,
  TRequires extends ReadonlyArray<Port<unknown, string>>,
  TLifetime extends Lifetime,
> {
  /** The stream port this adapter provides */
  readonly provides: StreamPort<T, E, TName>;

  /** Ports this adapter depends on (resolved from container) */
  readonly requires?: TRequires;

  /** Instance lifetime. Default: "scoped" */
  readonly lifetime?: TLifetime;

  /**
   * Factory function that receives resolved dependencies
   * and returns a StreamProducer<T, E>.
   */
  readonly factory: (deps: InferDeps<TRequires>) => StreamProducer<T, E>;
}
```

### Two Overloads

**No dependencies:**

```typescript
const SimpleTickerAdapter = createStreamAdapter({
  provides: TickerPort,
  factory: () => () =>
    createStream<number>(sink => {
      let count = 0;
      const id = setInterval(() => sink.next(count++), 1000);
      return () => clearInterval(id);
    }),
});
```

**With dependencies:**

```typescript
const WsPriceAdapter = createStreamAdapter({
  provides: PriceTickerPort,
  requires: [WebSocketClientPort, AuthPort],
  factory:
    ({ wsClient, auth }) =>
    () =>
      createStream<PriceTick>(sink => {
        const conn = wsClient.connect("wss://prices.example.com", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        conn.onMessage(msg => sink.next(JSON.parse(msg)));
        conn.onError(err => sink.terminate(err));
        conn.onClose(() => sink.complete());
        return () => conn.close();
      }),
});
```

### Return Type

Returns `Result<Adapter, StreamAdapterError>` (frozen). The adapter carries the `__streamAdapterBrand` symbol for introspection classification.

## 19. createSubjectAdapter

Creates an adapter that provides a `Subject<T, E>` for a `SubjectPort`. Default lifetime is `"singleton"` because subjects are typically shared.

### Factory Signature

```typescript
function createSubjectAdapter<
  T,
  E,
  TName extends string,
  const TRequires extends ReadonlyArray<Port<unknown, string>> = [],
  TLifetime extends Lifetime = "singleton",
>(
  config: SubjectAdapterConfig<T, E, TName, TRequires, TLifetime>
): Result<Adapter<SubjectPort<T, E, TName>, TRequires, TLifetime, "sync">, StreamAdapterError>;
```

### SubjectAdapterConfig

```typescript
interface SubjectAdapterConfig<
  T,
  E,
  TName extends string,
  TRequires extends ReadonlyArray<Port<unknown, string>>,
  TLifetime extends Lifetime,
> {
  readonly provides: SubjectPort<T, E, TName>;
  readonly requires?: TRequires;
  readonly lifetime?: TLifetime;

  /**
   * Factory that returns a Subject<T, E>.
   * Common patterns:
   * - createSubject<T, E>() for basic multicast
   * - createBehaviorSubject<T, E>(initialValue) for current-value multicast
   * - createReplaySubject<T, E>(bufferSize) for replay multicast
   */
  readonly factory: (deps: InferDeps<TRequires>) => Subject<T, E>;
}
```

### Example

```typescript
const EventBusAdapter = createSubjectAdapter({
  provides: EventBusPort,
  factory: () => createSubject<AppEvent>(),
});

const ThemeAdapter = createSubjectAdapter({
  provides: ThemePort,
  factory: () => createBehaviorSubject<Theme>("light"),
});
```

## 20. createOperatorAdapter

Creates an adapter that provides an `Operator<TIn, EIn, TOut, EOut>` for an `OperatorPort`.

### Factory Signature

```typescript
function createOperatorAdapter<
  TIn,
  EIn,
  TOut,
  EOut,
  TName extends string,
  const TRequires extends ReadonlyArray<Port<unknown, string>> = [],
  TLifetime extends Lifetime = "singleton",
>(
  config: OperatorAdapterConfig<TIn, EIn, TOut, EOut, TName, TRequires, TLifetime>
): Result<
  Adapter<OperatorPort<TIn, EIn, TOut, EOut, TName>, TRequires, TLifetime, "sync">,
  StreamAdapterError
>;
```

### Example

```typescript
const ProdEnrichAdapter = createOperatorAdapter({
  provides: EnrichPricePort,
  requires: [MarketMetadataPort],
  factory:
    ({ metadata }) =>
    source =>
      source.pipe(
        map(tick => ({
          ...tick,
          marketName: metadata.getMarket(tick.symbol),
          enrichedAt: Date.now(),
        }))
      ),
});
```

## 21. Adapter Composition

Stream adapters compose naturally with the HexDI graph:

```typescript
// Infrastructure ports
const WebSocketClientPort = port<WsClient>()({ name: "WsClient" });
const AuthPort = port<AuthService>()({ name: "Auth" });

// Stream port
const PriceTickerPort = createStreamPort<PriceTick>()({
  name: "PriceTicker",
});

// Operator port
const EnrichPricePort = createOperatorPort<PriceTick, never, EnrichedTick>()({
  name: "EnrichPrice",
});

// Subject port
const PriceAlertsPort = createSubjectPort<PriceAlert>()({
  name: "PriceAlerts",
});

// All adapters compose in the graph
const graph = GraphBuilder.create()
  .provide(wsClientAdapter) // Infrastructure
  .provide(authAdapter) // Infrastructure
  .provide(WsPriceAdapter) // StreamPort adapter (requires WsClient, Auth)
  .provide(ProdEnrichAdapter) // OperatorPort adapter (requires MarketMetadata)
  .provide(priceAlertsAdapter) // SubjectPort adapter
  .build();

// If any required port is missing, TypeScript reports a compile-time error
```

### Bridge to @hex-di/core createAdapter

All `create*Adapter` functions internally call `@hex-di/core`'s `createAdapter`, ensuring stream adapters are standard HexDI adapters that participate in:

- **Graph validation** -- missing dependencies caught at compile time
- **Lifetime analysis** -- captive dependency violations detected
- **Resolution hooks** -- tracing, logging, metrics applied automatically
- **Scope management** -- scoped adapters create per-scope instances

## 22. Lifetime Semantics

| Lifetime      | Default For                                     | Behavior                                                                                                    |
| ------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `"scoped"`    | `createStreamAdapter`                           | New stream producer per scope. Each component/request gets its own stream pipeline.                         |
| `"singleton"` | `createSubjectAdapter`, `createOperatorAdapter` | Shared instance. Subjects are typically shared across the app. Operators are stateless, so sharing is safe. |
| `"transient"` | (explicit opt-in)                               | New producer on every `resolve()`. Rarely needed -- use for unique stream instances per resolution.         |

### Scoped Streams

```typescript
// Each scope gets its own producer instance
const ScopedLogAdapter = createStreamAdapter({
  provides: RequestLogPort,
  lifetime: "scoped",
  factory: () => () =>
    createStream<LogEntry>(sink => {
      // Each request scope creates a new log stream
      const entries: LogEntry[] = [];
      return {
        log: (entry: LogEntry) => {
          entries.push(entry);
          sink.next(entry);
        },
      };
    }),
});
```

### Singleton Subjects

```typescript
// One event bus shared across the entire application
const EventBusAdapter = createSubjectAdapter({
  provides: EventBusPort,
  lifetime: "singleton", // default for subjects
  factory: () => createSubject<AppEvent>(),
});
```

---

_Previous: [03 - Stream Ports](./03-stream-ports.md)_

_Next: [05 - Stream Creation](./05-stream-creation.md)_
