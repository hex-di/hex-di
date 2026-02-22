# Library src/ Directory Layout

Consistent directory structure across all lib core packages.

```
src/
  index.ts          # Root barrel — all public exports, sectioned by area
  ports/            # Port definitions (DirectedPort tokens + service interfaces)
  adapters/         # createAdapter() implementations, one subdir per variant
  types/            # Domain types, interfaces, enums used across the lib
  context/          # createContextVariable() bindings for ambient state propagation
  inspection/       # Devtools integration: inspector port, library-inspector bridge
  instrumentation/  # Container hooks: resolution lifecycle hooks, tracing spans/logs
  testing/          # Test assertion helpers (assertXxx, matchers) — no vitest peer dep here
  utils/            # Pure utility functions with no DI coupling
  framework/        # Framework middleware (Hono, Express, etc.)
  integration/      # Cross-lib wiring: library-inspector-adapter, registry adapters
```

**Key distinctions:**
- `inspection/` — devtools read-only query API, inspector port, library-inspector bridge
- `instrumentation/` — container hooks that emit tracing spans or logs during resolution
- `integration/` — adapters that wire this lib into the broader HexDI ecosystem (library-inspector, registry)
- `context/` — always `createContextVariable()` from `@hex-di/core`; ambient state threaded through DI
- Not all dirs are required — only create what the lib needs
