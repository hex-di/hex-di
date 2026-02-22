# Adapter: factory vs class

Use `factory` for custom wiring logic. Use `class` for pure constructor injection.

```typescript
// factory — any wiring logic, functional construction
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createConsoleLogger(),
});

// factory with deps
export const ScopedLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [LogHandlerPort],
  lifetime: "scoped",
  factory: deps => createHandlerLogger(deps.LogHandler),
});

// class — pure constructor injection, no wiring logic
export const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  lifetime: "singleton",
  class: UserServiceImpl,  // constructor receives (database, logger) in requires order
});
```

- `factory` and `class` are mutually exclusive — providing both is a compile-time error
- With `class`, constructor params must match `requires` array order
- With `factory`, deps are accessed by port name (`deps.LogHandler`), order is irrelevant
