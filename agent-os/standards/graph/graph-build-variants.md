# Graph Build Variants

| Method | Throws? | Requires all deps? | Use when |
|---|---|---|---|
| `.build()` | Yes (`GraphBuildException`) | Yes | Root graph — all deps must be present |
| `.tryBuild()` | No (`Result<Graph, Error>`) | Yes | Root graph with graceful startup error handling |
| `.buildFragment()` | Yes | No | Child graph — parent satisfies missing deps |
| `.tryBuildFragment()` | No (`Result<Graph, Error>`) | No | Child graph with graceful error handling |

```typescript
// Root graph — throws on any missing/cyclic dependency
export const rootGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

// Child graph — parent supplies LoggerPort; fragment build skips missing-dep check
export const childGraph = GraphBuilder.forParent(rootGraph)
  .provide(UserServiceAdapter) // requires LoggerPort — satisfied by parent at runtime
  .buildFragment();

// Graceful error handling at startup
const result = GraphBuilder.create()
  .provide(LoggerAdapter)
  .tryBuild();

if (result.isErr()) {
  console.error("Graph invalid:", result.error.message);
  process.exit(1);
}
const container = createContainer({ graph: result.value, name: "App" });
```

- All four variants still run runtime cycle and captive-dependency validation
- `.buildFragment()` / `.tryBuildFragment()` suppress **missing dependency** errors only
- Use `GraphBuilder.forParent(parentGraph)` before building a fragment so the type checker knows which ports the parent provides
