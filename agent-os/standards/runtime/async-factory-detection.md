# Async Factory Detection

The runtime detects async factories by checking `factory.constructor.name === "AsyncFunction"`.
This only matches the `async () => {}` syntax — not `() => Promise.resolve()`.

```typescript
// ✅ Detected as async — lifetime forced to "singleton", requires initialize()
export const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: async () => {
    const data = await fetch("/config").then(r => r.json());
    return createConfig(data);
  },
});

// ❌ NOT detected as async — treated as sync singleton, initialize() has no effect
export const BadConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => fetch("/config").then(r => r.json()).then(createConfig),
  //        ^ returns a Promise but is NOT an async function
});
```

## Rules

- **Always use `async () => {}`** syntax for factories that return a Promise
- **Never use** `() => somePromise` or `() => Promise.resolve(x)` for async factories
- Async factories are automatically forced to `lifetime: "singleton"` at runtime — specifying another lifetime is ignored
- The adapter's port will appear in `TAsyncPorts` type param only when the `async` keyword is used
