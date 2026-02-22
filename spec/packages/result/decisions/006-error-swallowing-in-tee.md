# ADR-006: Error Swallowing in Tee Operations

## Status

Accepted

## Context

`andTee(f)` and `orTee(f)` are side-effect methods designed for logging, metrics, telemetry, or other fire-and-forget operations. The question is what happens when `f` throws:

1. **Propagate** — Let the exception bubble up. This matches `inspect(f)` behavior but means a logging failure can crash the pipeline.
2. **Swallow** — Catch and suppress exceptions from `f`. The original `Result` is returned unchanged regardless.
3. **Wrap in Err** — Catch the exception and convert it to an `Err`. This changes the pipeline's error type.

## Decision

`andTee` and `orTee` catch and suppress all exceptions from `f`. The original `Result` is returned unchanged.

```ts
// Ok.andTee
andTee(f) {
  try {
    f(value);
  } catch {
    // andTee swallows errors from f
  }
  return self;
}

// Err.orTee
orTee(f) {
  try {
    f(error);
  } catch {
    // orTee swallows errors from f
  }
  return self;
}
```

In `ResultAsync`, the async versions also catch after awaiting:

```ts
andTee(f: (value: T) => void | Promise<void>): ResultAsync<T, E> {
  return new ResultAsync(
    this.#promise.then(async result => {
      if (result._tag === "Ok") {
        try { await resolveValue(f(result.value)); } catch { }
      }
      return result;
    })
  );
}
```

## Consequences

**Positive**:
- Logging/telemetry failures cannot crash the pipeline
- Return type is unchanged — no error type accumulation from the side effect
- Simple mental model: "tee" means "peek without affecting the flow"
- Consistent behavior between sync and async variants

**Negative**:
- Silent error suppression can hide bugs in the side-effect function
- Debugging issues in `f` requires explicit logging/error handling within `f` itself
- Developers expecting `inspect`-like behavior (no suppression) may be surprised

**Mitigation**: The library provides `inspect(f)` and `inspectErr(f)` as non-swallowing alternatives. Use `inspect` when you want exceptions from `f` to propagate. Use `andThrough(f)` when you want `Result`-based error propagation from the side effect.

> **GxP Warning**: In regulated environments (FDA 21 CFR Part 11, EU GMP Annex 11), audit-critical logging operations **must not** use `andTee` or `orTee`, because silent suppression of logging failures can constitute a data integrity violation. Use `inspect(f)` or `inspectErr(f)` for audit-critical side effects where failure must be observable. See [compliance/gxp.md](../compliance/gxp.md#audit-trail-requirements) for recommended patterns.

**Comparison**:
| Method       | Runs on | Catches exceptions | Propagates Err from f |
| ------------ | ------- | ------------------ | --------------------- |
| `andTee`     | Ok      | Yes                | No                    |
| `orTee`      | Err     | Yes                | No                    |
| `inspect`    | Ok      | No                 | N/A                   |
| `inspectErr` | Err     | No                 | N/A                   |
| `andThrough` | Ok      | No                 | Yes                   |
