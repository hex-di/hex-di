# Test Container Setup

No shared test helper exists. Write the full pipeline inline per test.

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Inline adapter with vi.fn() for the ports under test
const logFn = vi.fn();
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "singleton",
  factory: () => ({ log: logFn }),
});

const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

const container = createContainer({ graph, name: "Test" });
const logger = container.resolve(LoggerPort);
```

- Only register the ports the test actually needs — no extras
- `name` is required in `createContainer`; use a descriptive string (e.g. `"Test"`, `"UserServiceTest"`)
- For scoped services, call `container.createScope()` and resolve from the scope
- Prefer `vi.fn()` inline adapters over real adapters when the dep is a side-effectful collaborator
