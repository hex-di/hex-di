# Sub-Graph + Merge Pattern

Each domain module exports an **unbuilt builder** (not a graph). The root merges all builders and calls `.build()` once.

```typescript
// core-graph.ts — export the builder, not .build()
export const coreGraphBuilder = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter);

// feature-graph.ts — export the builder, not .build()
export const featureGraphBuilder = GraphBuilder.create()
  .provide(UserServiceAdapter)
  .provide(NotificationAdapter);

// root-graph.ts — merge all builders, build once
import { coreGraphBuilder } from "./core-graph.js";
import { featureGraphBuilder } from "./feature-graph.js";

export const rootGraph = coreGraphBuilder
  .merge(featureGraphBuilder)
  .build();
```

```typescript
// main.ts
const container = createContainer({ graph: rootGraph, name: "Root" });
```

- Export the **builder** (without `.build()`) from sub-graph files
- Call `.build()` exactly once — in the root composition file
- `.merge(otherBuilder)` combines adapters; duplicate ports cause a compile-time error
- Sub-graph builders do NOT need all their deps satisfied — root merge fills gaps
