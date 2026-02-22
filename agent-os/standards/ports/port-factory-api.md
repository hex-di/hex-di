# Port Factory API

Use `port<T>()({...})` (preferred) for literal name inference.
Use `createPort<TName, T>({...})` only when explicit type params are needed.

Always include all metadata fields, even optional ones.

```typescript
// Preferred
export const LoggerPort = port<Logger>()({
  name: "Logger",
  direction: "outbound",
  description: "Structured logging service for context-aware log output",
  category: "logger/logger",
  tags: ["logging", "observability"],
});

// Alternative (explicit type params)
export const LoggerPort = createPort<"Logger", Logger>({
  name: "Logger",
  direction: "outbound",
  description: "Structured logging service for context-aware log output",
  category: "logger/logger",
  tags: ["logging", "observability"],
});
```

- Always provide `description`, `category`, and `tags` — they are optional in the API but required by convention
- `port<T>()` curried form preserves `name` as a string literal in the resulting type
- `createPort` requires repeating the name string as a type argument to achieve the same
- `lifetime` is **not** a port config field (it belongs to `createAdapter`)
- There is no `definePort` function
