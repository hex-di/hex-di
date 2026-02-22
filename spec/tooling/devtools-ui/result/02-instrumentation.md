_Previous: [01-overview.md](01-overview.md) | Next: [03-views-and-wireframes.md](03-views-and-wireframes.md)_

# 2. Instrumentation Layer

The Result Panel operates at two levels of data fidelity:

- **Level 0 (zero-config)**: Per-port aggregate statistics from the existing `ResultStatistics` in `@hex-di/core`. Works without any code changes.
- **Level 1 (opt-in tracing)**: Per-step operation traces captured by an instrumented Result wrapper. Requires wrapping chains with a tracing decorator.

## 2.1 Level 0: Existing Per-Port Statistics

### Data Source

The runtime already tracks `ResultStatistics` per port:

```typescript
// From @hex-di/core (already exists)
interface ResultStatistics {
  readonly portName: string;
  readonly totalCalls: number;
  readonly okCount: number;
  readonly errCount: number;
  readonly errorRate: number;
  readonly errorsByCode: ReadonlyMap<string, number>;
  readonly lastError: unknown | undefined;
}
```

### Access Pattern

```typescript
// Via InspectorDataSource (already exists)
dataSource.getAllResultStatistics(): ReadonlyMap<string, ResultStatistics>;
dataSource.subscribe("resultStatistics", callback): () => void;
```

### Panel Capabilities at Level 0

| Feature                                 | Available                               |
| --------------------------------------- | --------------------------------------- |
| Overview dashboard with ok/err counts   | Yes                                     |
| Per-port error rate badges              | Yes                                     |
| Error distribution by code              | Yes                                     |
| Stability score (computed from history) | Yes                                     |
| Railway pipeline visualization          | No (no chain structure)                 |
| Per-step value inspection               | No (no step data)                       |
| Case explorer                           | No (no path data)                       |
| Sankey aggregate flow                   | Partial (port-level only, not per-step) |

## 2.2 Level 1: Per-Step Chain Tracing

### 2.2.1 Tracing Wrapper API

A `tracedResult` wrapper that intercepts each operation and records a `ResultStepTrace`.

```typescript
// Public API in @hex-di/result (new)
interface TracedResultOptions {
  /** Chain label for identification. */
  readonly label?: string;

  /** Maximum number of executions to retain (ring buffer). Default: 100. */
  readonly maxExecutions?: number;

  /** Whether to serialize intermediate values. Default: true.
   *  Set to false for performance-sensitive chains. */
  readonly captureValues?: boolean;

  /** Maximum depth for value serialization. Default: 3. */
  readonly serializationDepth?: number;
}

/**
 * Wraps a Result to enable per-step tracing.
 *
 * Usage:
 *   const result = traced(ok(42), { label: "validateUser" })
 *     .map(x => x + 1)
 *     .andThen(validate)
 *     .match(onOk, onErr);
 */
function traced<T, E>(result: Result<T, E>, options?: TracedResultOptions): TracedResult<T, E>;

/**
 * Wraps a ResultAsync to enable per-step tracing.
 */
function tracedAsync<T, E>(
  result: ResultAsync<T, E>,
  options?: TracedResultOptions
): TracedResultAsync<T, E>;
```

### 2.2.2 TracedResult Interface

`TracedResult<T, E>` mirrors the full `Result<T, E>` API but records each operation.

```typescript
interface TracedResult<T, E> {
  // All standard Result methods (map, andThen, orElse, etc.)
  // Each method:
  //   1. Records a ResultStepTrace before delegating
  //   2. Returns a new TracedResult (preserving the trace chain)
  //   3. Captures input/output values and track state

  /** Access the underlying (unwrapped) Result. */
  readonly inner: Result<T, E>;

  /** Access the chain descriptor built during construction. */
  readonly descriptor: ResultChainDescriptor;

  /** Access execution traces collected so far. */
  readonly executions: readonly ResultChainExecution[];
}
```

### 2.2.3 Chain Descriptor Construction

The descriptor is built incrementally as methods are called:

```
traced(ok(42))              → descriptor.operations = []
  .map(f)                   → descriptor.operations = [{ method: "map", index: 0, ... }]
  .andThen(g)               → descriptor.operations = [{ map... }, { method: "andThen", index: 1, ... }]
  .orElse(h)                → descriptor.operations = [{ map... }, { andThen... }, { method: "orElse", index: 2, ... }]
  .match(onOk, onErr)       → descriptor.operations = [{ ... }, { ... }, { ... }, { method: "match", index: 3, ... }]
```

### 2.2.4 Step Trace Recording

Each operation records:

```
Step 0 (map):
  inputTrack: "ok"  →  outputTrack: "ok"   →  switched: false
  inputValue: 42    →  outputValue: 43
  durationMicros: 0

Step 1 (andThen):
  inputTrack: "ok"  →  outputTrack: "err"  →  switched: true
  inputValue: 43    →  outputValue: { _tag: "ValidationError", field: "email" }
  durationMicros: 0

Step 2 (orElse):
  inputTrack: "err" →  outputTrack: "ok"   →  switched: true
  inputValue: { _tag: "ValidationError", ... }  →  outputValue: { default: true }
  durationMicros: 0

Step 3 (match):
  inputTrack: "ok"  →  terminal
  inputValue: { default: true }
  durationMicros: 0
```

### 2.2.5 Value Serialization

Intermediate values are serialized into `SerializedValue` (see [Section 1.4.4](01-overview.md)) for inspection. The serializer:

1. Handles primitives directly (string, number, boolean, null, undefined)
2. Handles `Date` → ISO string
3. Handles `Error` → `{ name, message, stack }`
4. Handles arrays → truncated at `serializationDepth` items
5. Handles objects → truncated at `serializationDepth` keys
6. Handles circular references → `"[Circular]"` placeholder
7. Handles functions → `"[Function: name]"` placeholder
8. Handles `Map`/`Set` → converted to array representations
9. Total serialized size capped at 10KB per value

## 2.3 Container Integration

### 2.3.1 Registering Traced Chains with the Inspector

Traced chains automatically register with the container's inspector:

```typescript
// When traced() is called inside an adapter factory:
const adapter = createAdapter({
  provides: UserPort,
  requires: [DbPort],
  factory: ({ Db }) => ({
    getUser: (id: string) =>
      traced(Db.findById(id), { label: "getUser" })
        .andThen(validateUser)
        .map(toUserDto)
        .match(
          user => user,
          err => {
            throw err;
          }
        ),
  }),
  lifetime: "singleton",
});

// The traced() wrapper:
// 1. Detects the active container scope (via async context)
// 2. Registers the chain descriptor with the inspector
// 3. Publishes execution traces to the inspector event bus
```

### 2.3.2 Inspector Data Source Extension

New methods on `InspectorDataSource` for the Result panel:

```typescript
interface InspectorDataSource {
  // ... existing methods ...

  /** Get all registered chain descriptors. */
  getResultChainDescriptors(): ReadonlyMap<string, ResultChainDescriptor>;

  /** Get recent executions for a specific chain. */
  getResultChainExecutions(chainId: string): readonly ResultChainExecution[];

  /** Get computed paths for a chain. */
  getResultChainPaths(chainId: string): readonly ResultPathDescriptor[];

  /** Get the full Result panel snapshot. */
  getResultPanelSnapshot(): ResultPanelSnapshot;

  /** Subscribe to Result-related updates. */
  subscribe(
    event: "resultChainRegistered" | "resultChainExecuted" | "resultStatisticsUpdated",
    callback: () => void
  ): () => void;
}
```

## 2.4 Adapter-Level Automatic Tracing

For adapters where the factory return type is `Result<T, E>` or `ResultAsync<T, E>`, the runtime can optionally auto-wrap with tracing:

```typescript
const container = createContainer({
  graph,
  name: "MyApp",
  inspect: {
    resultTracing: true, // Enable auto-tracing
    resultTracingDepth: 3, // Value serialization depth
    resultTracingBuffer: 200, // Execution ring buffer size
  },
});
```

When `resultTracing: true`:

- Every adapter whose resolved value has a `_tag: "Ok" | "Err"` property gets wrapped
- The wrapper intercepts method calls and records traces
- Zero overhead when disabled (no wrapping occurs)

## 2.5 Performance Considerations

| Concern                     | Mitigation                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Memory from retained values | Ring buffer (default 100 executions), configurable `maxExecutions`                                     |
| Serialization cost          | `captureValues: false` disables value capture. Depth limit caps traversal.                             |
| Proxy overhead per call     | Tracing uses a lightweight forwarding wrapper, not a `Proxy`. Each method call adds ~1-2 microseconds. |
| Event bus pressure          | Traces are batched: published every 16ms (one animation frame), not per-step.                          |
| Large value serialization   | 10KB cap per value. Exceeding values are truncated with `truncated: true` flag.                        |

## 2.6 Playground Integration

In the Playground context, all Result chains are automatically traced because:

1. The playground sandbox runs user code in a controlled environment
2. The sandbox patches `ok()` and `err()` constructors to return `TracedResult` instances
3. No user opt-in needed -- the playground is an educational environment

```typescript
// Playground sandbox patches (internal)
const originalOk = result.ok;
const originalErr = result.err;

result.ok = <T>(value: T) => traced(originalOk(value), { label: "entry" });
result.err = <E>(error: E) => traced(originalErr(error), { label: "entry" });
```

This ensures every Result chain in the playground is fully instrumented for the Railway Pipeline and Case Explorer views.

_Previous: [01-overview.md](01-overview.md) | Next: [03-views-and-wireframes.md](03-views-and-wireframes.md)_
