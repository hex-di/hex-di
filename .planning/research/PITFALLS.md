# Domain Pitfalls: Distributed Tracing in TypeScript DI Container

**Domain:** Adding distributed tracing to HexDI (v7.0)
**Researched:** 2026-02-06
**Scope:** Replacing existing `TraceCollector`/`TracingAPI` with distributed tracing system supporting cross-container propagation, multiple backends, and framework integration

## Critical Pitfalls

Mistakes that cause rewrites, breaking changes, or production incidents.

### Pitfall 1: Cross-Container Trace Context Loss with Isolated Tracers

**What goes wrong:** Parent container creates child container with isolated tracer, losing trace context continuity. Parent can't see child resolutions despite "distributed" tracing goal.

**Why it happens:** Current architecture has per-container isolated tracing:

```typescript
// From trace.ts
export function trace<TProvides, TExtends, TAsyncPorts, TPhase, R>(
  container: Container<...>,
  fn: () => R
): TraceResult<R>
```

Each container gets its own `container.tracer` property. When creating child containers:

- Child gets fresh tracer instance (new MemoryCollector, new span buffer)
- Parent's active span context not propagated to child
- Resolution chains crossing container boundaries create disconnected traces
- No parent-child relationship in span data

**Consequences:**

- Distributed tracing breaks at container boundaries (defeats the purpose)
- Parent container can't trace child container resolutions
- Span parent/child relationships lost across containers
- Debugging dependency chains impossible when crossing containers
- Backend exporters see disconnected traces, not unified call tree

**Warning signs:**

- Test: Parent traces child resolution, expects to see child spans → gets empty traces
- Span parent/child relationships show `parentId: null` when should show parent span
- Cross-container dependency resolution invisible in trace output
- Jaeger/Zipkin shows disconnected traces instead of unified timeline

**Prevention:**

1. **Shared tracer propagation:**

   ```typescript
   interface CreateChildOptions {
     // Force child to use parent's tracer
     inheritTracer?: boolean; // Default: true
   }

   // Child inherits parent tracer + active span context
   const child = container.createChild(childGraph, {
     inheritTracer: true, // Reuse parent tracer instance
   });
   ```

2. **Context variable for active span:**

   ```typescript
   // Use existing ContextVariable system
   export const ActiveSpanVar = createContextVariable<Span | undefined>(
     'hex-di/active-span',
     undefined
   )

   // Resolution engine checks ActiveSpanVar, creates child span
   function resolveInternal(port: Port): Service {
     const parentSpan = ActiveSpanVar.get()
     if (parentSpan) {
       // Create child span under parent
       return tracer.withSpan('resolve ' + port.name, () => {...}, {
         parent: parentSpan.context
       })
     }
   }
   ```

3. **Tracer inheritance mode configuration:**

   ```typescript
   enum TracerInheritanceMode {
     SHARED = "shared", // Child uses parent tracer (distributed tracing)
     FORKED = "forked", // Child gets copy with same exporter (isolated buffers)
     ISOLATED = "isolated", // Child gets fresh tracer (testing)
   }
   ```

4. **Resolution hook propagates context:**
   ```typescript
   container.addHook("beforeResolve", ctx => {
     // Check if resolving from child container
     if (ctx.parentPort && ctx.containerKind === "child") {
       // Propagate parent container's active span context
       const parentSpan = getActiveSpanFromParentContainer();
       if (parentSpan) {
         ActiveSpanVar.set(parentSpan);
       }
     }
   });
   ```

**Detection:**

- Write integration test: Parent creates child, resolve child port, check parent sees span
- Check `SpanData.parentSpanId` is set correctly for cross-container resolutions
- Use `instrumentContainer()` on parent, resolve from child, verify spans captured
- Trace output shows full dependency tree including child containers

**Phase:** Address in Phase 1 (Cross-Container Propagation Architecture)

**Severity:** **CRITICAL** — Breaks core "distributed tracing" requirement

**References:**

- `/packages/runtime/src/trace.ts` (lines 84-120) - Current isolated trace() function
- `/packages/runtime/src/types/container.ts` (lines 256-267) - createChild() has no tracer config
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 319-359) - Auto-instrumentation spec
- `.planning/PROJECT.md` (lines 98) - "Cross-container tracing" requirement

---

### Pitfall 2: Memory Leak from Unclosed Spans in Async Resolution Failures

**What goes wrong:** Async factory throws error mid-resolution, span never closed, accumulates in memory. Long-running apps leak memory from failed async initializations.

**Why it happens:** Current async resolution in `async-initializer.ts`:

```typescript
private async executeInitialization(resolveAsync: AsyncInitializationResolver): Promise<void> {
  for (const level of this.initLevels) {
    const levelPromises = level.map(async adapter => {
      try {
        await resolveAsync(adapter.provides); // Span started here
      } catch (error) {
        throw new AsyncFactoryError(portName, new Error(contextMessage));
        // Span never closed if error thrown
      }
    });
    await Promise.all(levelPromises);
  }
}
```

Tracing hook pattern:

```typescript
beforeResolve: ctx => {
  const span = tracer.startSpan("resolve " + ctx.portName);
  spanMap.set(ctx.portName, span); // Stored for afterResolve
};

afterResolve: ctx => {
  const span = spanMap.get(ctx.portName);
  span?.end(); // afterResolve NEVER CALLED if factory throws
  spanMap.delete(ctx.portName);
};
```

**Consequences:**

- Memory leak: Span objects + attributes + events accumulate unbounded
- SpanProcessor buffers grow without limit
- Async errors leave "zombie spans" in recording state
- Backend exporters receive incomplete span data
- Production memory usage grows linearly with failed resolutions

**Warning signs:**

- Heap snapshots show SpanData objects growing over time
- `SpanProcessor` buffer size increases without bound
- Failed async initialization followed by memory pressure
- `span.isRecording()` returns true for old spans that should be closed
- Backend shows spans with no end time ("in progress" forever)

**Prevention:**

1. **try/finally in resolution hooks:**

   ```typescript
   beforeResolve: ctx => {
     const span = tracer.startSpan("resolve " + ctx.portName);
     spanMap.set(ctx.portName, span);
   };

   // Add error hook (new hook type)
   onResolutionError: (ctx, error) => {
     const span = spanMap.get(ctx.portName);
     if (span) {
       span.recordException(error);
       span.setStatus("error", error.message);
       span.end();
       spanMap.delete(ctx.portName);
     }
   };
   ```

2. **Span lifecycle tied to WeakMap:**

   ```typescript
   // Spans automatically GC'd when port object collected
   const spanMap = new WeakMap<Port<unknown, string>, Span>();

   beforeResolve: ctx => {
     const span = tracer.startSpan("resolve " + ctx.portName);
     spanMap.set(ctx.port, span); // Use port object, not name string
   };
   ```

3. **Timeout-based span auto-close:**

   ```typescript
   class SpanImpl implements Span {
     private timeout: NodeJS.Timeout;

     constructor() {
       // Auto-close span after 30s if never closed
       this.timeout = setTimeout(() => {
         if (this.isRecording()) {
           this.setStatus("error", "Span not closed after 30s");
           this.end();
         }
       }, 30000);
     }

     end() {
       clearTimeout(this.timeout);
       // ... close span
     }
   }
   ```

4. **Bounded buffer with eviction:**

   ```typescript
   interface SpanProcessorOptions {
     maxBufferedSpans: number; // Default: 1000
     evictionPolicy: "oldest" | "random"; // Drop when full
   }
   ```

5. **Resolution engine catch block closes spans:**
   ```typescript
   async function resolveAsyncInternal(port: Port): Promise<Service> {
     const span = tracer.startSpan("resolve " + port.name);
     try {
       const service = await adapter.factory(deps);
       span.setStatus("ok");
       return service;
     } catch (error) {
       span.recordException(error);
       span.setStatus("error");
       throw error;
     } finally {
       span.end(); // ALWAYS close, even on error
     }
   }
   ```

**Detection:**

- Write test: Throw error in async factory, check span.isRecording() === false
- Memory profiler: Run 1000 failed resolutions, check heap doesn't grow
- Leak test: Create container, fail async init, dispose, check WeakRef cleared
- Integration test: Backend exporter receives spans with status='error' and endTime set

**Phase:** Address in Phase 2 (Span Lifecycle Management)

**Severity:** **CRITICAL** — Production memory leak

**References:**

- `/packages/runtime/src/container/internal/async-initializer.ts` (lines 264-296) - Async initialization loop
- `/packages/runtime/src/resolution/async-engine.ts` - Async resolution implementation
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 100-113) - Span interface with end() method

---

### Pitfall 3: Type Erasure in Generic SpanExporter Breaks Type-Safe Attributes

**What goes wrong:** SpanExporter generic over AttributeValue, but TypeScript erases generics at runtime. Backends receive wrong attribute types, fail validation.

**Why it happens:** Spec defines attributes as union:

```typescript
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

export type Attributes = Readonly<Record<string, AttributeValue>>;
```

But OTEL has stricter types:

```typescript
// From @opentelemetry/api
type AttributeValue = string | number | boolean | Array<null | undefined | string> | ...
```

TypeScript unions are checked at compile time, erased at runtime:

```typescript
span.setAttribute('port.lifetime', 'singleton'); // OK at compile time
span.setAttribute('port.depth', 5); // OK at compile time
span.setAttribute('port.tags', ['async', 'database']); // OK at compile time

// At runtime, backend exporter does:
if (typeof value === 'string') { ... }
// But type info lost, can't validate array element types
```

Project constraint: **No `any` types, no type casting**.

**Consequences:**

- OTEL exporter crashes: "AttributeValue must be string | number | boolean"
- Array attributes fail validation in Jaeger/Zipkin
- Type-safe `span.setAttribute()` at call site, but runtime type mismatch
- Can't cast `value as string` (violates CLAUDE.md rules)
- Need to handle 6 distinct AttributeValue variants without casting

**Warning signs:**

- OTEL exporter throws: "Invalid attribute type: object"
- Jaeger exporter receives `[object Object]` instead of array
- Type tests pass but integration tests with real backend fail
- Need to add `as any` or `as unknown as` (violates project rules)

**Prevention:**

1. **Discriminated union with type guards:**

   ```typescript
   type StringAttribute = { type: 'string'; value: string };
   type NumberAttribute = { type: 'number'; value: number };
   type BooleanAttribute = { type: 'boolean'; value: boolean };
   type StringArrayAttribute = { type: 'string[]'; value: string[] };

   type Attribute =
     | StringAttribute
     | NumberAttribute
     | BooleanAttribute
     | StringArrayAttribute
     | NumberArrayAttribute
     | BooleanArrayAttribute;

   // Type guard instead of cast
   function isStringAttribute(attr: Attribute): attr is StringAttribute {
     return attr.type === 'string';
   }

   // Exporter uses type guards
   export(spans: SpanData[]): Promise<void> {
     for (const span of spans) {
       for (const [key, attr] of Object.entries(span.attributes)) {
         if (isStringAttribute(attr)) {
           otelSpan.setAttribute(key, attr.value); // Proven string
         } else if (isNumberAttribute(attr)) {
           otelSpan.setAttribute(key, attr.value); // Proven number
         }
         // ... all 6 cases
       }
     }
   }
   ```

2. **Builder pattern with method overloads:**

   ```typescript
   interface Span {
     setAttribute(key: string, value: string): void;
     setAttribute(key: string, value: number): void;
     setAttribute(key: string, value: boolean): void;
     setAttributeArray(key: string, value: string[]): void;
     setAttributeArray(key: string, value: number[]): void;
     setAttributeArray(key: string, value: boolean[]): void;
   }

   // Type preserved through overload resolution
   span.setAttribute("port.name", "Logger"); // Calls string overload
   span.setAttributeArray("port.tags", ["async"]); // Calls string[] overload
   ```

3. **Branded types for attribute values:**

   ```typescript
   type StringAttr = string & { __brand: "StringAttr" };
   type NumberAttr = number & { __brand: "NumberAttr" };

   function stringAttr(value: string): StringAttr {
     return value as StringAttr;
   }

   // Type preserved at runtime through brand
   span.setAttribute("name", stringAttr("Logger"));
   ```

4. **Runtime type validation in SpanExporter adapter:**

   ```typescript
   function validateAttribute(value: unknown): AttributeValue {
     if (typeof value === "string") return value;
     if (typeof value === "number") return value;
     if (typeof value === "boolean") return value;
     if (Array.isArray(value) && value.every(v => typeof v === "string")) {
       return value as string[];
     }
     // ... all array cases
     throw new TypeError(`Invalid attribute type: ${typeof value}`);
   }
   ```

5. **Conditional types to preserve type info:**

   ```typescript
   type ExtractAttributeType<T> = T extends string
     ? "string"
     : T extends number
       ? "number"
       : T extends boolean
         ? "boolean"
         : T extends string[]
           ? "string[]"
           : T extends number[]
             ? "number[]"
             : T extends boolean[]
               ? "boolean[]"
               : never;

   interface TypedAttribute<T> {
     readonly type: ExtractAttributeType<T>;
     readonly value: T;
   }
   ```

**Detection:**

- Type test: `span.setAttribute('key', 123)` should infer type at compile time
- Runtime test: Pass attribute to OTEL exporter, check no cast needed
- Integration test: Send span with all 6 attribute types to Jaeger, verify received
- ESLint check: No `as any`, `as unknown as`, or type assertions in exporter code

**Phase:** Address in Phase 3 (Type-Safe Attributes Design)

**Severity:** **CRITICAL** — Type safety violation, breaks project rules

**References:**

- `/CLAUDE.md` (lines 4-5) - **Never use type casting** rule
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 74-86) - AttributeValue type definition
- `@opentelemetry/api` - OTEL type requirements (external dep)

---

### Pitfall 4: AsyncLocalStorage Context Loss in React Concurrent Rendering

**What goes wrong:** React 18 concurrent rendering breaks AsyncLocalStorage-based trace context propagation. Spans created in different render passes lose parent relationship.

**Why it happens:** React 18 concurrent features:

- **Time slicing**: Single render split across multiple event loop ticks
- **Suspense**: Render paused, resumed later in different ALS context
- **startTransition**: Low-priority updates scheduled independently

AsyncLocalStorage assumes single execution context:

```typescript
// Node.js AsyncLocalStorage
const als = new AsyncLocalStorage<SpanContext>();

function withSpan(name: string, fn: () => void) {
  const span = tracer.startSpan(name);
  als.run(span.context, () => {
    fn(); // Works if fn() is synchronous
  });
  span.end();
}

// React concurrent render
function Component() {
  const tracer = useTracer();

  // Render may pause/resume, breaking ALS context
  return tracer.withSpan('render-component', (span) => {
    return <Suspense fallback={<Loading />}>
      <AsyncComponent /> {/* Rendered in different ALS context */}
    </Suspense>
  });
}
```

**Consequences:**

- Spans created in concurrent renders have `parentId: null`
- Distributed traces fragmented by React render boundaries
- Server components (RSC) lose trace context across server/client boundary
- Child component spans disconnected from parent component spans
- Browser environments don't have AsyncLocalStorage at all

**Warning signs:**

- Test with React 18: Create parent span, render with Suspense, child span has no parent
- Concurrent mode enabled: Spans show disconnected in trace viewer
- RSC: Server-side span context not propagated to client hydration
- Browser console: "AsyncLocalStorage is not defined"

**Prevention:**

1. **React Context for trace propagation (browser):**

   ```typescript
   const TraceContext = React.createContext<SpanContext | undefined>(undefined);

   function TracingProvider({ tracer, children }) {
     const [spanContext, setSpanContext] = useState<SpanContext>();

     return (
       <TraceContext.Provider value={spanContext}>
         {children}
       </TraceContext.Provider>
     );
   }

   function useTracer(): Tracer {
     const parentContext = useContext(TraceContext);
     // Tracer uses React Context, not ALS
     return tracerWithContext(parentContext);
   }
   ```

2. **Explicit span context passing:**

   ```typescript
   interface TracingProviderProps {
     parentSpanContext?: SpanContext; // Explicit, not implicit ALS
     children: ReactNode;
   }

   function TracingProvider({ parentSpanContext, children }) {
     // Pass context explicitly through tree
   }
   ```

3. **Dual strategy: ALS for Node, React Context for browser:**

   ```typescript
   const isNode = typeof process !== "undefined" && process.versions?.node;

   const TraceContextStore = isNode
     ? new AsyncLocalStorage<SpanContext>() // Node.js
     : undefined; // Browser falls back to React Context

   function getActiveSpanContext(): SpanContext | undefined {
     if (TraceContextStore) {
       return TraceContextStore.getStore(); // Node.js
     }
     return useContext(TraceContext); // Browser
   }
   ```

4. **Server Component span serialization:**

   ```typescript
   // Server component
   async function ServerComponent() {
     const span = tracer.startSpan('server-render');

     // Serialize span context for client
     const serialized = serializeSpanContext(span.context);

     return (
       <div data-trace-context={serialized}>
         <ClientComponent />
       </div>
     );
   }

   // Client component
   function ClientComponent() {
     const element = useRef<HTMLElement>();
     const parentContext = deserializeSpanContext(
       element.current?.dataset.traceContext
     );
     // Create child span with parent context
   }
   ```

5. **Hook-based context pinning:**

   ```typescript
   function useTracedEffect(name: string, fn: () => void, deps: unknown[]) {
     const tracer = useTracer();
     const spanContext = useContext(TraceContext); // Capture at hook call site

     useEffect(() => {
       // Pin span context from hook call, not effect execution
       tracer.withSpan(name, fn, { parent: spanContext });
     }, deps);
   }
   ```

**Detection:**

- React 18 test: Render with Suspense, check child span has parentSpanId
- Concurrent mode test: Use startTransition, verify trace continuity
- RSC test: Server span context propagates to client hydration
- Browser test: No AsyncLocalStorage usage, React Context works

**Phase:** Address in Phase 5 (React Integration)

**Severity:** **HIGH** — React integration broken, common use case

**References:**

- `/integrations/react/src/providers/` - React integration (needs ReactiveHexDIProvider equivalent)
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 479-512) - React integration spec
- React 18 docs: Concurrent features (external)

---

## High Pitfalls

Mistakes that cause production issues or major rework.

### Pitfall 5: Span Processor Batching Deadlock with Sync Disposal

**What goes wrong:** Container disposal waits for span processor shutdown, span processor waits for batch flush, batch flush needs event loop, but disposal is synchronous → deadlock.

**Why it happens:** Disposal lifecycle in `lifecycle-manager.ts`:

```typescript
async dispose(): Promise<void> {
  // Dispose child containers first (LIFO)
  for (const child of [...this.childContainers].reverse()) {
    await child.dispose();
  }

  // Dispose singletons (LIFO)
  for (const [_, finalizer] of [...this.finalizers].reverse()) {
    await finalizer();
  }

  // Problem: SpanProcessor finalizer needs to flush
  await spanProcessorFinalizer(); // Waits for batch export
  // But if called from sync context (e.g., process.on('exit')), deadlocks
}
```

SpanProcessor with batching:

```typescript
class BatchSpanProcessor implements SpanProcessor {
  private buffer: SpanData[] = [];
  private flushTimer: NodeJS.Timeout;

  async shutdown(): Promise<void> {
    clearTimeout(this.flushTimer);
    await this.forceFlush(); // Needs event loop to export batch
  }

  async forceFlush(): Promise<void> {
    const batch = [...this.buffer];
    this.buffer = [];
    await this.exporter.export(batch); // HTTP request, needs event loop
  }
}
```

Deadlock scenario:

```
1. process.on('SIGTERM', () => container.dispose()) → Sync call
2. container.dispose() → Async but called from sync handler
3. spanProcessor.shutdown() → Waits for flush
4. flush needs event loop → But event loop blocked waiting for dispose
5. Deadlock or timeout
```

**Consequences:**

- Container disposal hangs, never completes
- Process shutdown timeout (kill -9 needed)
- Spans lost on graceful shutdown (batch not flushed)
- Backend never receives final spans before app exit
- Integration tests timeout on cleanup

**Warning signs:**

- Test: Call `container.dispose()`, times out after 5s
- Process exit handler hangs, needs SIGKILL
- Backend shows missing spans from end of trace
- Disposal promise never resolves in test

**Prevention:**

1. **Background flush with immediate return:**

   ```typescript
   class BatchSpanProcessor {
     private shutdownPromise: Promise<void> | null = null;

     async shutdown(): Promise<void> {
       if (this.shutdownPromise) return this.shutdownPromise;

       this.shutdownPromise = (async () => {
         // Start flush but don't await in finalizer
         const flushPromise = this.forceFlush();

         // Use Promise.race with timeout
         await Promise.race([
           flushPromise,
           new Promise(resolve => setTimeout(resolve, 5000)), // 5s timeout
         ]);
       })();

       return this.shutdownPromise;
     }
   }
   ```

2. **Separate sync and async disposal:**

   ```typescript
   interface Container {
     dispose(): Promise<void>; // Async, waits for flush
     disposeSync(): void; // Sync, best-effort flush
   }

   // Process exit uses sync
   process.on("SIGTERM", () => {
     container.disposeSync(); // Doesn't wait
     process.exit(0);
   });

   // Normal shutdown uses async
   await app.close();
   await container.dispose(); // Waits for flush
   ```

3. **SpanProcessor with non-blocking shutdown:**

   ```typescript
   interface SpanProcessor {
     shutdown(options?: { timeout?: number }): Promise<void>;
   }

   class BatchSpanProcessor {
     async shutdown({ timeout = 5000 } = {}): Promise<void> {
       const flushPromise = this.forceFlush();
       const timeoutPromise = new Promise((_, reject) =>
         setTimeout(() => reject(new Error("Shutdown timeout")), timeout)
       );

       try {
         await Promise.race([flushPromise, timeoutPromise]);
       } catch (error) {
         // Log warning but don't block disposal
         console.warn("Span flush timeout, some spans may be lost");
       }
     }
   }
   ```

4. **Disposal with abort signal:**

   ```typescript
   interface DisposeOptions {
     signal?: AbortSignal; // Abort if disposal taking too long
     timeout?: number;
   }

   async dispose(options?: DisposeOptions): Promise<void> {
     const abortController = new AbortController();
     const timeout = setTimeout(
       () => abortController.abort(),
       options?.timeout ?? 10000
     );

     try {
       await this.disposeInternal({ signal: abortController.signal });
     } finally {
       clearTimeout(timeout);
     }
   }
   ```

5. **Finalizer priority levels:**

   ```typescript
   enum FinalizerPriority {
     HIGH = 0, // Must complete (DB connections)
     MEDIUM = 1, // Should complete (file writes)
     LOW = 2, // Nice to have (span flush)
   }

   // Low priority finalizers timeout faster
   for (const finalizer of sortedByPriority) {
     const timeout = getTimeoutForPriority(finalizer.priority);
     await Promise.race([finalizer(), delay(timeout)]);
   }
   ```

**Detection:**

- Test: Dispose with 1000 buffered spans, check completes < 5s
- Integration test: SIGTERM handler calls dispose, process exits < 10s
- Memory test: Dispose doesn't leak pending promises
- Stress test: High span throughput + rapid container disposal

**Phase:** Address in Phase 4 (SpanProcessor Batching)

**Severity:** **HIGH** — Production reliability issue

**References:**

- `/packages/runtime/src/container/internal/lifecycle-manager.ts` - Disposal LIFO order
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 226-255) - SpanProcessor interface

---

### Pitfall 6: Performance Degradation from High-Resolution Timing Overhead

**What goes wrong:** Using `performance.now()` for every span start/end adds 5-10μs overhead per call. In hot path (transient resolutions), this becomes 10-20% throughput impact.

**Why it happens:** Spec requires high-resolution timing:

```typescript
interface Span {
  readonly startTime: number; // High-resolution timestamp
  end(endTime?: number): void;
}

class SpanImpl {
  constructor(name: string) {
    this.startTime = performance.now(); // ~5μs call
  }

  end() {
    this.endTime = performance.now(); // Another ~5μs
    this.duration = this.endTime - this.startTime;
  }
}
```

In DI resolution hot path:

```typescript
function resolve<P>(port: P): InferService<P> {
  const span = tracer.startSpan("resolve " + port.name); // 5μs
  try {
    const service = adapter.factory(deps); // 50μs (fast factory)
    span.end(); // 5μs
    return service;
  } catch (error) {
    span.end(); // 5μs
    throw error;
  }
}

// Overhead: 10μs / 50μs total = 20% overhead
```

Transient lifetime = every call creates new instance:

```typescript
// 1000 calls = 10ms overhead just from timing
for (let i = 0; i < 1000; i++) {
  container.resolve(TransientPort); // 20% slower with tracing
}
```

**Consequences:**

- Tracing degrades throughput by 10-20% even for no-op tracer
- High-frequency resolutions (transient, scoped per-request) most impacted
- Performance tests fail: "Expected <1ms, got 1.2ms (20% regression)"
- Users disable tracing in production due to overhead
- NoOp tracer not actually zero-cost

**Warning signs:**

- Benchmark: Container with NoOp tracer 10-20% slower than no tracer
- Profiler: `performance.now()` shows up in hot path
- Transient resolution throughput drops significantly
- Production CPU usage increases after enabling tracing

**Prevention:**

1. **Lazy timing - only when span exported:**

   ```typescript
   class SpanImpl {
     private _startTime?: number;
     private _endTime?: number;
     private createdAt: number; // Captured once at creation

     get startTime(): number {
       // Compute only when accessed (export time)
       return (this._startTime ??= this.createdAt);
     }

     end() {
       // Only store end time if span will be exported
       if (this.willBeExported()) {
         this._endTime = performance.now();
       }
     }
   }
   ```

2. **Batched timing for fast operations:**

   ```typescript
   class BatchTimingSpan {
     private operations: Array<{ name: string }> = [];

     recordOperation(name: string) {
       // No timing per operation
       this.operations.push({ name });
     }

     end() {
       // Single timing call for entire batch
       const endTime = performance.now();
       this.duration = endTime - this.startTime;
       // Distribute duration across operations
       const avgDuration = this.duration / this.operations.length;
     }
   }
   ```

3. **Sampling - only time subset of spans:**

   ```typescript
   interface SpanOptions {
     sampled?: boolean; // Only sampled spans get timing
   }

   class SpanImpl {
     constructor(name: string, options: SpanOptions) {
       if (options.sampled) {
         this.startTime = performance.now(); // Only if sampled
       }
     }
   }

   // Head-based sampling: Sample 10% of spans
   const span = tracer.startSpan("resolve", {
     sampled: Math.random() < 0.1,
   });
   ```

4. **Zero-cost NoOp path:**

   ```typescript
   const noOpSpan: Span = {
     context: { traceId: "", spanId: "", traceFlags: 0 },
     name: "",
     startTime: 0, // No performance.now() call
     setAttribute: () => {}, // Empty function
     setAttributes: () => {},
     addEvent: () => {},
     setStatus: () => {},
     recordException: () => {},
     end: () => {}, // No timing
     isRecording: () => false,
   };

   class NoOpTracer implements Tracer {
     startSpan() {
       return noOpSpan;
     } // No allocation, no timing
     withSpan(_, fn) {
       return fn(noOpSpan);
     } // Direct call, no overhead
   }
   ```

5. **Conditional timing based on threshold:**

   ```typescript
   interface AutoInstrumentOptions {
     minDurationMs?: number; // Only time if > threshold
   }

   function createTracingHook(tracer: Tracer, options: AutoInstrumentOptions) {
     return {
       beforeResolve: ctx => {
         // Estimate if resolution will be fast
         if (ctx.lifetime === "singleton" && ctx.isCacheHit) {
           return; // Skip timing for cached singletons
         }

         const span = tracer.startSpan("resolve " + ctx.portName);
         spanMap.set(ctx.portName, span);
       },
     };
   }
   ```

**Detection:**

- Benchmark: 10000 transient resolutions with NoOp tracer vs no tracer
- Profiler: Check `performance.now()` CPU time < 1% of total
- Micro-benchmark: Single span creation + end < 1μs average
- Throughput test: Tracing overhead < 5% for realistic workload

**Phase:** Address in Phase 6 (Performance Optimization)

**Severity:** **HIGH** — Production performance impact

**References:**

- `/packages/runtime/tests/tracer.test.ts` (lines 425-458) - Overhead measurement test
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 658-664) - Performance considerations

---

### Pitfall 7: Breaking Changes Cascade Through All Integration Packages

**What goes wrong:** Replacing `container.tracer: TracingAPI` with `container.tracer: Tracer` breaks `@hex-di/hono`, `@hex-di/react`, `@hex-di/testing`, `@hex-di/visualization`.

**Why it happens:** Current API in `types/container.ts`:

```typescript
interface Container {
  readonly tracer: TracingAPI; // OLD API (v5.0-v6.0)
}

interface TracingAPI {
  getTraces(filter?: TraceFilter): readonly TraceEntry[];
  getStats(): TraceStats;
  pause(): void;
  resume(): void;
  clear(): void;
  subscribe(callback: (entry: TraceEntry) => void): () => void;
  isPaused(): boolean;
  pin(traceId: string): void;
  unpin(traceId: string): void;
}
```

New API in v7.0:

```typescript
interface Container {
  readonly tracer: Tracer; // NEW API (v7.0+)
}

interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  withSpan<T>(name: string, fn: (span: Span) => T): T;
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T>;
  getActiveSpan(): Span | undefined;
  // ... NO getTraces(), getStats(), pause(), etc.
}
```

Downstream breakage:

```typescript
// @hex-di/hono - BREAKS
app.get('/debug/traces', (c) => {
  const container = c.get('hexContainer');
  const traces = container.tracer.getTraces(); // ERROR: Property 'getTraces' does not exist on type 'Tracer'
  return c.json(traces);
});

// @hex-di/react - BREAKS
function useTraceStats() {
  const container = useContainer();
  return container.tracer.getStats(); // ERROR: Property 'getStats' does not exist
}

// @hex-di/visualization - BREAKS
function TraceTimeline() {
  const traces = container.tracer.getTraces({ minDuration: 50 }); // ERROR
  return <Timeline traces={traces} />;
}
```

**Consequences:**

- 4+ integration packages fail to typecheck after runtime update
- All examples using `container.tracer.*` break
- Documentation out of sync with implementation
- Users upgrading to v7.0 see massive breaking change
- Website demos and showcase apps broken

**Warning signs:**

- `pnpm -r typecheck` fails in integrations/, examples/, website/
- Type error: "Property 'X' does not exist on type 'Tracer'"
- Examples in README.md fail to compile
- Showcase apps throw runtime errors

**Prevention:**

1. **Dual property approach (migration path):**

   ```typescript
   interface Container {
     readonly tracer: Tracer; // NEW: Span-based tracing
     readonly inspector: InspectorAPI; // EXISTING: Pull-based inspection
     readonly traceCollector: TraceCollector; // NEW: Collection API
   }

   interface TraceCollector {
     getTraces(filter?: TraceFilter): readonly TraceEntry[];
     getStats(): TraceStats;
     subscribe(callback: (entry: TraceEntry) => void): () => void;
     // ... OLD TracingAPI methods
   }

   // TracingAPI deprecated, delegate to TraceCollector
   get tracer(): TracingAPI {
     console.warn('container.tracer.getTraces() is deprecated, use container.traceCollector.getTraces()');
     return this.traceCollector;
   }
   ```

2. **Adapter pattern for compatibility:**

   ```typescript
   class TracingAPIAdapter implements TracingAPI {
     constructor(
       private tracer: Tracer,
       private collector: TraceCollector
     ) {}

     // OLD API delegates to NEW API
     getTraces(filter?: TraceFilter) {
       return this.collector.getTraces(filter);
     }

     startSpan(name: string) {
       return this.tracer.startSpan(name);
     }
   }

   interface Container {
     readonly tracer: Tracer & TracingAPI; // Intersection for compatibility
   }
   ```

3. **Separate tracing and inspection concerns:**

   ```typescript
   interface Container {
     readonly tracer: Tracer; // Write API (create spans)
     readonly inspector: InspectorAPI; // Read API (query state)
   }

   interface InspectorAPI {
     getTraces(filter?: TraceFilter): readonly TraceEntry[];
     getStats(): TraceStats;
     // ... inspection methods
   }

   // Update downstream to use correct API
   // @hex-di/hono
   const traces = container.inspector.getTraces(); // Correct API

   // @hex-di/react
   const stats = container.inspector.getStats(); // Correct API
   ```

4. **Phased migration with deprecation warnings:**

   ```typescript
   // v7.0: Deprecate old API, both APIs work
   interface Container {
     /** @deprecated Use container.inspector.getTraces() instead */
     readonly tracer: TracingAPI & Tracer;
     readonly inspector: InspectorAPI;
   }

   // v7.1: Remove old API, breaking change documented
   interface Container {
     readonly tracer: Tracer;
     readonly inspector: InspectorAPI;
   }
   ```

5. **Cross-package integration test:**

   ```typescript
   // Run during CI for runtime package
   describe("Integration Compatibility", () => {
     it("works with @hex-di/hono", async () => {
       const { createScopeMiddleware } = await import("@hex-di/hono");
       const middleware = createScopeMiddleware(container);
       // Verify middleware still works with new Container type
     });

     it("works with @hex-di/react", async () => {
       const { HexDIProvider } = await import("@hex-di/react");
       // Verify provider still works
     });
   });
   ```

**Detection:**

- CI: `pnpm -r typecheck` in monorepo catches all breakages
- Type tests: Verify Container type compatible with integration usage
- Example tests: Run all example code in tests
- Documentation tests: Extract code blocks from README, run as tests

**Phase:** Address in Phase 7 (Migration Strategy)

**Severity:** **HIGH** — Breaks all downstream packages

**References:**

- `/packages/runtime/src/types/container.ts` (lines 422-444) - Current tracer property
- `/integrations/hono/src/middleware.ts` - Uses container type
- `/integrations/react/` - Uses container type
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 688-697) - Migration section

---

## Medium Pitfalls

Mistakes that cause delays, technical debt, or partial functionality loss.

### Pitfall 8: OpenTelemetry Version Mismatch Between Spec and Implementation

**What goes wrong:** Spec defines attributes compatible with OTEL 1.9.0, but `@opentelemetry/api` 1.10+ changes SpanContext type. Exporter adapters fail to compile.

**Why it happens:** OTEL API evolves rapidly:

```typescript
// @opentelemetry/api@1.9.0
interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: TraceFlags;
  traceState?: TraceState;
}

// @opentelemetry/api@1.10.0 (hypothetical breaking change)
interface SpanContext {
  traceId: TraceId; // Now branded type, not string
  spanId: SpanId; // Branded type
  traceFlags: number; // Changed from TraceFlags enum
}
```

HexDI spec uses string IDs:

```typescript
// From SPEC-TRACING.md
export interface SpanContext {
  readonly traceId: string; // HexDI uses string
  readonly spanId: string;
  readonly traceFlags: number;
}
```

Exporter bridge code:

```typescript
// @hex-di/tracing-otel adapter
function convertToOtel(hexSpan: SpanData): OtelSpan {
  return {
    spanContext: {
      traceId: hexSpan.context.traceId, // ERROR: Type 'string' not assignable to 'TraceId'
      spanId: hexSpan.context.spanId, // ERROR: Type 'string' not assignable to 'SpanId'
    },
  };
}
```

**Consequences:**

- `@hex-di/tracing-otel` package fails to build after OTEL update
- Need to cast (violates CLAUDE.md rule: no type casting)
- Version pinning creates security vulnerabilities (outdated OTEL deps)
- Other backends (Jaeger, Zipkin) may have different ID formats

**Warning signs:**

- Type error in tracing-otel: "Type 'string' not assignable to type 'TraceId'"
- Need to add `as TraceId` cast (violates project rules)
- CI fails after dependency update
- `pnpm update` breaks tracing-otel build

**Prevention:**

1. **Opaque branded types in HexDI spec:**

   ```typescript
   export type TraceId = string & { __brand: "TraceId" };
   export type SpanId = string & { __brand: "SpanId" };

   export interface SpanContext {
     readonly traceId: TraceId; // Branded, compatible with OTEL
     readonly spanId: SpanId;
     readonly traceFlags: number;
   }

   // Factory functions enforce format
   export function createTraceId(value: string): TraceId {
     if (!/^[0-9a-f]{32}$/.test(value)) {
       throw new Error("Invalid trace ID format");
     }
     return value as TraceId;
   }
   ```

2. **Adapter abstraction layer:**

   ```typescript
   // @hex-di/tracing-otel
   interface OtelBridge {
     toOtelTraceId(hexId: string): unknown; // Abstract over OTEL type
     toOtelSpanId(hexId: string): unknown;
     fromOtelTraceId(otelId: unknown): string;
     fromOtelSpanId(otelId: unknown): string;
   }

   // Version-specific implementations
   class OtelBridge_v1_9 implements OtelBridge { ... }
   class OtelBridge_v1_10 implements OtelBridge { ... }

   // Detect OTEL version at runtime
   const bridge = detectOtelVersion() >= 1.10
     ? new OtelBridge_v1_10()
     : new OtelBridge_v1_9();
   ```

3. **Pin OTEL version with override comment:**

   ```json
   {
     "dependencies": {
       "@opentelemetry/api": "1.9.0" // PINNED: v1.10 breaks SpanContext type
     }
   }
   ```

4. **W3C Trace Context strings (spec-compliant):**

   ```typescript
   // Use W3C format directly, bypass OTEL types
   type TraceParent = `00-${string}-${string}-${string}`; // version-traceId-spanId-flags

   export interface SpanContext {
     readonly traceparent: TraceParent; // W3C spec format
   }

   // Parse on-demand
   function getTraceId(context: SpanContext): string {
     const [version, traceId] = context.traceparent.split("-");
     return traceId;
   }
   ```

5. **Integration tests with multiple OTEL versions:**
   ```typescript
   // Test with OTEL 1.9, 1.10, 1.11
   describe.each([
     { version: "1.9.0", otelApi: otel_1_9 },
     { version: "1.10.0", otelApi: otel_1_10 },
   ])("OTEL $version compatibility", ({ otelApi }) => {
     it("converts span context", () => {
       const hexSpan = createTestSpan();
       const otelSpan = convertToOtel(hexSpan, otelApi);
       expect(otelSpan).toBeDefined();
     });
   });
   ```

**Detection:**

- Dependabot PR updates OTEL → CI catches type errors
- Type test: Export HexDI span to OTEL exporter, check compiles
- Integration test: Send span through OTEL exporter to real backend
- Version matrix test: Test against OTEL 1.x, 2.x

**Phase:** Address in Phase 8 (Backend Adapters)

**Severity:** **MEDIUM** — Maintenance burden, version lock-in

**References:**

- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 89-97) - SpanContext type
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 614-638) - OTEL exporter
- `@opentelemetry/api` package (external dependency)

---

### Pitfall 9: Span Attribute Key Collisions with User-Defined Attributes

**What goes wrong:** Auto-instrumentation adds attributes with keys like `port.name`, user code also sets `port.name`, last write wins, debugging data lost.

**Why it happens:** Spec defines auto-instrumentation attributes:

```typescript
interface ResolutionSpanAttributes {
  "hex-di.port.name": string;
  "hex-di.port.lifetime": "singleton" | "scoped" | "transient";
  "hex-di.resolution.cached": boolean;
  "hex-di.resolution.scope_id"?: string;
  "hex-di.resolution.duration_ms": number;
}
```

But user code can set same keys:

```typescript
container.addHook("beforeResolve", ctx => {
  const span = tracer.getActiveSpan();
  span?.setAttribute("hex-di.port.name", "CustomName"); // Overwrites auto-instrumentation
});

// Or in manual span
tracer.withSpan("my-operation", span => {
  span.setAttribute("hex-di.port.lifetime", "transient"); // Conflicts with auto-instrumentation
});
```

Last write wins:

```typescript
// Auto-instrumentation sets first
span.setAttribute("hex-di.port.name", "Logger");

// User code overwrites
span.setAttribute("hex-di.port.name", "CustomLogger");

// Backend receives: { 'hex-di.port.name': 'CustomLogger' }
// Original 'Logger' lost
```

**Consequences:**

- Debugging data overwritten by user code
- Auto-instrumentation loses attribute values
- No way to distinguish auto vs manual attributes
- Backend queries fail (searching for 'Logger' but finds 'CustomLogger')

**Warning signs:**

- Attribute value in backend doesn't match expected auto-instrumentation value
- Trace query returns no results despite span existing
- User reports: "I set attribute X but backend shows Y"

**Prevention:**

1. **Reserved attribute namespace:**

   ```typescript
   const RESERVED_PREFIXES = ["hex-di.", "hexdi.", "_hexdi"];

   class SpanImpl {
     setAttribute(key: string, value: AttributeValue): void {
       // Validate key not in reserved namespace
       if (RESERVED_PREFIXES.some(prefix => key.startsWith(prefix))) {
         throw new Error(
           `Attribute key '${key}' uses reserved prefix. ` +
             `Reserved prefixes: ${RESERVED_PREFIXES.join(", ")}`
         );
       }
       this.attributes[key] = value;
     }
   }
   ```

2. **Separate system and user attributes:**

   ```typescript
   interface SpanData {
     readonly attributes: Attributes; // User-defined
     readonly systemAttributes: Attributes; // Auto-instrumentation, read-only
   }

   class SpanImpl {
     private systemAttrs: Record<string, AttributeValue> = {};
     private userAttrs: Record<string, AttributeValue> = {};

     setAttribute(key: string, value: AttributeValue): void {
       this.userAttrs[key] = value; // User can't overwrite system
     }

     setSystemAttribute(key: string, value: AttributeValue): void {
       this.systemAttrs[key] = value; // Internal API only
     }
   }
   ```

3. **Immutable attribute protection:**

   ```typescript
   class SpanImpl {
     private immutableKeys = new Set<string>();

     setImmutableAttribute(key: string, value: AttributeValue): void {
       this.attributes[key] = value;
       this.immutableKeys.add(key);
     }

     setAttribute(key: string, value: AttributeValue): void {
       if (this.immutableKeys.has(key)) {
         console.warn(`Attribute '${key}' is immutable, ignoring update`);
         return;
       }
       this.attributes[key] = value;
     }
   }
   ```

4. **Namespaced API:**

   ```typescript
   interface Span {
     setAttribute(key: string, value: AttributeValue): void; // User namespace

     // System attributes not exposed to user
     [INTERNAL_ACCESS]: {
       setSystemAttribute(key: string, value: AttributeValue): void;
     };
   }
   ```

5. **Documentation and lint rule:**

   ```typescript
   // ESLint rule: no-reserved-span-attributes
   // Warns if code uses 'hex-di.*' attribute keys

   // Documentation
   /**
    * Reserved attribute prefixes:
    * - `hex-di.*` - Auto-instrumentation
    * - `http.*` - HTTP semantic conventions
    * - `db.*` - Database semantic conventions
    *
    * Use custom namespace: `myapp.custom.attr`
    */
   ```

**Detection:**

- Test: Auto-instrument container, user sets 'hex-di.port.name', check throws error
- Test: Set system attribute, user tries to overwrite, check value unchanged
- Lint: Scan codebase for `setAttribute('hex-di.*', ...)`

**Phase:** Address in Phase 4 (Auto-Instrumentation)

**Severity:** **MEDIUM** — Data loss risk, debugging impact

**References:**

- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 362-370) - ResolutionSpanAttributes
- OpenTelemetry semantic conventions (external reference)

---

### Pitfall 10: Hono Middleware Timing Includes Downstream Middleware Overhead

**What goes wrong:** Hono tracing middleware measures total request time, but includes time spent in other middleware. Can't isolate DI resolution time from HTTP parsing, auth, logging, etc.

**Why it happens:** Hono middleware chain:

```typescript
app.use("*", loggingMiddleware); // 2ms
app.use("*", authMiddleware); // 5ms
app.use("*", tracingMiddleware); // Starts span
app.use("*", hexDiScopeMiddleware); // 1ms
app.get("/users", handler); // 10ms

// Tracing middleware measures: 2 + 5 + 1 + 10 = 18ms
// But only 1 + 10 = 11ms is relevant to DI
```

Middleware creates span at wrong level:

```typescript
export function tracingMiddleware(options: HonoTracingOptions): MiddlewareHandler {
  return async (c, next) => {
    const span = tracer.startSpan("http-request"); // Started too early
    await next(); // Includes all downstream middleware
    span.end(); // Duration includes everything
  };
}
```

**Consequences:**

- Spans show inflated duration (includes unrelated middleware)
- Can't identify if slowdown is in DI or elsewhere
- Misleading performance analysis
- Span attributes show DI metadata but duration includes non-DI work

**Warning signs:**

- Span duration 50ms but DI resolution only 5ms
- Performance regression but DI code unchanged
- Slow middleware before tracing middleware inflates all span durations

**Prevention:**

1. **Middleware ordering documentation:**

   ```typescript
   /**
    * Install tracingMiddleware AFTER other middleware that should
    * not be included in trace timing:
    *
    * ✅ GOOD:
    * app.use(loggingMiddleware);
    * app.use(authMiddleware);
    * app.use(tracingMiddleware);  // Last middleware before handler
    *
    * ❌ BAD:
    * app.use(tracingMiddleware);  // Includes all downstream
    * app.use(loggingMiddleware);
    * app.use(authMiddleware);
    */
   ```

2. **Separate request span from handler span:**

   ```typescript
   export function tracingMiddleware(options: HonoTracingOptions): MiddlewareHandler {
     return async (c, next) => {
       // Parent span for entire request
       const requestSpan = tracer.startSpan("http-request", {
         attributes: {
           "http.method": c.req.method,
           "http.route": c.req.routePath,
         },
       });

       try {
         await next(); // Includes middleware chain
       } finally {
         requestSpan.end();
       }

       // Child span for handler only (created in handler)
     };
   }

   // Handler creates child span
   app.get("/users", async c => {
     return tracer.withSpanAsync("get-users-handler", async span => {
       // Only handler logic measured
     });
   });
   ```

3. **Timing hooks per middleware:**

   ```typescript
   export function tracingMiddleware(options: HonoTracingOptions): MiddlewareHandler {
     return async (c, next) => {
       const span = tracer.startSpan("http-request");

       // Mark when handler starts
       const handlerStartTime = performance.now();
       await next();
       const handlerDuration = performance.now() - handlerStartTime;

       span.setAttribute("handler.duration_ms", handlerDuration);
       span.setAttribute("middleware.duration_ms", span.duration - handlerDuration);
       span.end();
     };
   }
   ```

4. **Explicit middleware span nesting:**

   ```typescript
   // Each middleware creates child span
   app.use(async (c, next) => {
     await tracer.withSpanAsync("logging-middleware", async () => {
       // Logging logic
       await next();
     });
   });

   app.use(async (c, next) => {
     await tracer.withSpanAsync("auth-middleware", async () => {
       // Auth logic
       await next();
     });
   });

   // Trace shows:
   // http-request (18ms)
   //   ├─ logging-middleware (2ms)
   //   ├─ auth-middleware (5ms)
   //   └─ get-users-handler (10ms)
   ```

**Detection:**

- Test: Add slow middleware before tracing, check span duration excludes it
- Test: Compare span duration to handler-only timing, should match
- Integration test: Complex middleware chain, verify span nesting correct

**Phase:** Address in Phase 5 (Framework Integration)

**Severity:** **MEDIUM** — Misleading metrics, hard to debug

**References:**

- `/integrations/hono/src/middleware.ts` - Existing Hono middleware
- `/specs/tracing-and-logging/SPEC-TRACING.md` (lines 458-475) - Hono middleware spec

---

## Low Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 11: Span ID Generation Collisions in High-Throughput Scenarios

**What goes wrong:** Span ID generated from `Date.now() + random()` creates collisions in high-throughput apps (>10K spans/sec). Backend rejects spans with duplicate IDs.

**Why it happens:** Simple ID generation:

```typescript
function generateSpanId(): string {
  return Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
}

// High throughput: 1000 spans in 1ms
// Date.now() returns same value for all 1000
// Only Math.random() differs, but only 8 hex digits = 2^32 possibilities
// Birthday paradox: Collision after ~65K IDs
```

**Prevention:**

1. Use crypto.randomUUID() for W3C trace IDs
2. Counter + timestamp for guaranteed uniqueness
3. Use OTEL SDK's ID generator (hex encoded)

**Phase:** Address in Phase 3 (ID Generation)

**Severity:** **LOW** — Rare, only high-throughput apps

---

### Pitfall 12: Console Tracer Output Floods Terminal in Test Runs

**What goes wrong:** Tests using ConsoleTracerAdapter print spans to stdout, making test output unreadable.

**Why it happens:** Console adapter logs to `console.log()` by default:

```typescript
class ConsoleTracer {
  onEnd(span: SpanData): void {
    console.log(`[SPAN] ${span.name} (${span.duration}ms)`);
    // Test output now mixed with span logs
  }
}
```

**Prevention:**

1. Console adapter accepts custom logger (`{ logger: testLogger }`)
2. Environment detection: Disable console output in test environment
3. Use MemoryTracerAdapter in tests by default

**Phase:** Address in Phase 4 (Console Adapter)

**Severity:** **LOW** — Test ergonomics

---

### Pitfall 13: Missing TypeDoc Comments on Tracer Port Breaks API Documentation

**What goes wrong:** Tracer port methods lack JSDoc comments, generated API docs show "no description available".

**Why it happens:** Port definition omits comments:

```typescript
export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  withSpan<T>(name: string, fn: (span: Span) => T): T;
  // No JSDoc comments
}
```

**Prevention:**

1. Add comprehensive JSDoc to all public API methods
2. Include `@example` tags for common use cases
3. Document `@throws` conditions
4. CI checks for missing JSDoc (eslint-plugin-jsdoc)

**Phase:** Address in Phase 1 (Core Types)

**Severity:** **LOW** — Documentation quality

---

## Phase-Specific Warnings

| Phase | Description                 | Likely Pitfall                                          | Mitigation                                     |
| ----- | --------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| 1     | Core Tracing Types          | Type casting for attributes (Pitfall 3)                 | Discriminated unions, type guards              |
| 2     | Cross-Container Propagation | Context loss across containers (Pitfall 1)              | Shared tracer, context variables               |
| 3     | Span Lifecycle              | Unclosed spans on error (Pitfall 2)                     | try/finally, error hooks, WeakMap              |
| 4     | Auto-Instrumentation        | Attribute key collisions (Pitfall 9)                    | Reserved namespace, validation                 |
| 5     | Framework Integration       | React concurrent rendering context loss (Pitfall 4)     | React Context + ALS dual strategy              |
| 6     | Performance Optimization    | High-resolution timing overhead (Pitfall 6)             | Lazy timing, sampling, zero-cost NoOp          |
| 7     | Migration Strategy          | Breaking changes cascade (Pitfall 7)                    | Dual property, deprecation warnings            |
| 8     | Backend Adapters            | OTEL version mismatch (Pitfall 8)                       | Opaque types, adapter abstraction              |
| 9     | SpanProcessor Batching      | Disposal deadlock (Pitfall 5)                           | Timeout-based shutdown, abort signal           |
| 10    | Hono Integration            | Timing includes middleware overhead (Pitfall 10)        | Nested spans, middleware ordering docs         |
| All   | Type Safety                 | Need type casting to satisfy external types (Pitfall 3) | Type guards, branded types, runtime validation |
| All   | Breaking Changes            | Integration packages fail (Pitfall 7)                   | Cross-package integration tests, CI typecheck  |

---

## Testing Each Pitfall

| Pitfall                         | Test Type            | Test Location                                               |
| ------------------------------- | -------------------- | ----------------------------------------------------------- |
| Cross-container context loss    | Integration          | `packages/runtime/tests/cross-container-tracing.test.ts`    |
| Unclosed spans on error         | Unit + Memory        | `packages/runtime/tests/span-lifecycle.test.ts`             |
| Type-safe attributes            | Type-level + Runtime | `packages/tracing/tests/attributes.test-d.ts`               |
| React concurrent context loss   | Integration          | `integrations/react/tests/concurrent-tracing.test.tsx`      |
| Disposal deadlock               | Integration + Timing | `packages/runtime/tests/disposal-with-tracing.test.ts`      |
| High-resolution timing overhead | Benchmark            | `packages/runtime/tests/tracing-overhead.bench.ts`          |
| Breaking changes cascade        | Cross-package        | `packages/runtime/tests/integration-compat.test.ts`         |
| OTEL version mismatch           | Integration          | `packages/tracing-otel/tests/version-compat.test.ts`        |
| Attribute key collisions        | Unit                 | `packages/tracing/tests/attribute-namespace.test.ts`        |
| Hono middleware timing          | Integration          | `integrations/hono/tests/tracing-middleware-timing.test.ts` |

---

## Warning Signs by Phase

**Planning Phase:**

- [ ] No cross-container tracing test planned
- [ ] No span lifecycle error handling tests planned
- [ ] No type-level tests for attributes
- [ ] No React concurrent rendering tests planned
- [ ] No disposal timeout tests planned
- [ ] No performance benchmarks for tracing overhead
- [ ] No migration strategy for breaking changes
- [ ] No OTEL version compatibility plan

**Implementation Phase:**

- [ ] Child container spans show `parentId: null` (should have parent)
- [ ] Async factory error leaves span in recording state
- [ ] Need `as any` to convert attributes to OTEL format
- [ ] React Suspense breaks trace context
- [ ] `container.dispose()` hangs with span processor
- [ ] NoOp tracer still shows 10% overhead
- [ ] Integration packages fail typecheck
- [ ] OTEL exporter fails with "Invalid type"

**Testing Phase:**

- [ ] Cross-container test: Parent can't see child spans
- [ ] Memory leak test: Span objects accumulate
- [ ] Type test: Attribute conversion needs casting
- [ ] React test: Concurrent render loses parent span
- [ ] Disposal test: Times out after 30s
- [ ] Benchmark: 20% throughput regression with tracing
- [ ] Integration test: Hono/React packages broken

**Integration Phase:**

- [ ] Examples fail to compile after tracing update
- [ ] Website demos broken
- [ ] Backend shows disconnected traces
- [ ] Jaeger rejects spans with invalid format

---

## Sources

**HIGH Confidence:**

- `/packages/runtime/src/trace.ts` (206 lines) - Current isolated tracing
- `/packages/runtime/src/container/internal/async-initializer.ts` (298 lines) - Async initialization
- `/packages/runtime/src/types/container.ts` (554 lines) - Container type with tracer property
- `/packages/runtime/tests/tracer.test.ts` (992 lines) - Existing tracing tests
- `/specs/tracing-and-logging/SPEC-TRACING.md` (722 lines) - Official tracing spec
- `/CLAUDE.md` (lines 4-5) - **Never use type casting** rule
- `.planning/PROJECT.md` (lines 95-104) - v7.0 tracing requirements

**MEDIUM Confidence:**

- OpenTelemetry API documentation - Attribute types and span context (external)
- React 18 concurrent features - AsyncLocalStorage limitations (external docs)
- Node.js AsyncLocalStorage behavior - Context propagation (Node.js docs)
- Hono middleware chain execution - Order and timing (Hono docs)

**LOW Confidence:**

- Exact performance overhead of `performance.now()` (system-dependent)
- OTEL version compatibility specifics (requires testing matrix)
- React concurrent rendering edge cases (React internal behavior)
- Span ID collision probability (depends on throughput)

---

_Research completed: 2026-02-06_
_Confidence: HIGH for pitfalls derived from existing codebase and spec, MEDIUM for framework integration challenges, LOW for performance predictions_
_Gaps: Need actual benchmarks for timing overhead, need to test OTEL version compatibility, need to verify React 18 concurrent behavior with AsyncLocalStorage_
