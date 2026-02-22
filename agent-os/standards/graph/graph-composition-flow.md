# Graph Composition Flow

The full pipeline: create a builder → register adapters → build the graph → create a container.

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// 1. Start with an empty builder (static factory, not `new`)
const graph = GraphBuilder.create()
  // 2. Register adapters — immutable, each call returns a new builder
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(UserServiceAdapter)
  // 3. Finalize — validates all deps are satisfied, throws on error
  .build();

// 4. Create the runtime container — name is required
const container = createContainer({ graph, name: "AppContainer" });
```

- `GraphBuilder.create()` — static factory; never use `new GraphBuilder()`
- `.provide(adapter)` — immutable; always assign the result
- `.build()` — validates deps at compile time and runtime; throws `GraphBuildException` on missing/cyclic/captive dependencies
- `createContainer({ graph, name })` — `name` is required; used in diagnostics and debug routes
- Call `await container.initialize()` after creation if any adapter has an async factory
