# Memory Adapters for Testing

Built-in in-memory test doubles for logger and tracer ports.

## Memory Logger

```typescript
import { createMemoryLogger, MemoryLoggerAdapter } from "@hex-di/logger";

// Standalone (no DI)
const logger = createMemoryLogger();
logger.info("started");
const entries = logger.getEntries();
logger.clear();

// Via DI graph
const graph = GraphBuilder.create().provide(MemoryLoggerAdapter).build();
const container = createContainer({ graph, name: "Test" });
const logger = container.resolve(LoggerPort);
```

## Memory Tracer

```typescript
import { createMemoryTracer, MemoryTracerAdapter } from "@hex-di/tracing";

// Standalone (no DI)
const tracer = createMemoryTracer();
tracer.withSpan("op", span => { span.setAttribute("k", "v"); });
const spans = tracer.getCollectedSpans();
tracer.clear();

// Via DI graph
const graph = GraphBuilder.create().provide(MemoryTracerAdapter).build();
const container = createContainer({ graph, name: "Test" });
const tracer = container.resolve(TracerPort);
```

- Both adapters have lifetime `"transient"` — each injection gets a fresh instance
- Call `.clear()` in `beforeEach` when reusing an instance across tests
- `getCollectedSpans()` returns a flat array; parent-child relationships are tracked via `parentSpanId`
- Memory tracer has a 10 000-span limit with FIFO eviction
