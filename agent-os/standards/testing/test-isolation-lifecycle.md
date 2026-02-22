# Test Isolation Lifecycle

## Basic pattern — dispose within each test

```typescript
test("resolves user service", async () => {
  const graph = GraphBuilder.create().provide(UserServiceAdapter).build();
  const container = createContainer({ graph, name: "Test" });

  const service = container.resolve(UserServicePort);
  expect(service.getUser("1")).toBeDefined();

  await container.dispose(); // runs finalizers, frees resources
});
```

## Integration tests with shared state — use beforeEach/afterEach

```typescript
let container: Container;

beforeEach(() => {
  const graph = GraphBuilder.create().provide(LoggerAdapter).build();
  container = createContainer({ graph, name: "Test" });
});

afterEach(async () => {
  await container.dispose();
});
```

## Tracing instrumentation tests — also call clearStack()

```typescript
import { clearStack } from "@hex-di/tracing";

let tracer: MemoryTracer;

beforeEach(() => {
  tracer = createMemoryTracer();
});

afterEach(async () => {
  await container.dispose();
  clearStack(); // resets async span context — tracing tests only
});
```

- `clearStack()` is **only** needed when using `instrumentContainer()` or `withSpan()` — not for regular container tests
- Memory adapters: call `.clear()` in `beforeEach` if reusing an instance across tests
- Scopes must be disposed before their parent container
