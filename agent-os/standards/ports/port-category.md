# Port Category Convention

Use `"library/role"` format. The prefix scopes to the package, the suffix identifies the port's role within it.

```typescript
// logger package
category: "logger/logger"      // primary logger port
category: "logger/handler"     // log handler port
category: "logger/formatter"   // log formatter port
category: "logger/inspector"   // inspector port

// tracing package
category: "tracing/tracer"
category: "tracing/processor"
category: "tracing/exporter"

// saga package
category: "saga/saga"
category: "saga/saga-management"
```

- Do **not** use the `SuggestedCategory` enum values (`"logging"`, `"persistence"`, etc.) for lib ports — they are too coarse-grained
- `"library-inspector"` is **reserved**: the container's `afterResolve` hook detects this category and auto-wires inspection adapters. Never use it for regular ports.
