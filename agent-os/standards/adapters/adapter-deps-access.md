# Adapter Deps Access

In a `factory`, dependencies are accessed by the port's `name` field — not the variable name.

```typescript
// LogHandlerPort has name: "LogHandler"
// TracerPort has name: "Tracer"

export const ScopedLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [LogHandlerPort, TracerPort],
  lifetime: "scoped",
  factory: deps => createHandlerLogger(
    deps.LogHandler,  // not deps.LogHandlerPort
    deps.Tracer,      // not deps.TracerPort
  ),
});
```

- `deps.<Name>` where `<Name>` is the port's `name:` field (without `Port` suffix)
- Order of `requires` is irrelevant for `factory` — access by name, not position
- For `class`, constructor params **must** match `requires` array order (positional injection)
