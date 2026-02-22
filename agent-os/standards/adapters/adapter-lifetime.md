# Adapter Lifetime

Match the lifetime to the lifecycle of the thing being wrapped.

| Lifetime | When to use | Examples |
|---|---|---|
| `"singleton"` | Stateless or globally shared | Logger, Tracer, HTTP client, config |
| `"scoped"` | Holds per-request/per-scope state | Request-bound logger, user context |
| `"transient"` | Must never be shared across injections | Memory adapters for test isolation |

```typescript
// singleton — shared, stateless
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "singleton",
  factory: () => createConsoleLogger(),
});

// scoped — new instance per scope (e.g. per HTTP request)
export const ScopedLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [LogHandlerPort],
  lifetime: "scoped",
  factory: deps => createHandlerLogger(deps.LogHandler),
});

// transient — new instance per injection, used for test isolation
export const MemoryLoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "transient",
  factory: () => createMemoryLogger(),
});
```

- Default when `lifetime` is omitted: `"singleton"`
- **Async factories are forced to `"singleton"`** — async + scoped/transient is a compile-time error
- **Captive dependency**: a longer-lived adapter cannot require a shorter-lived one — GraphBuilder catches this at build time (e.g. singleton requiring scoped is an error)
