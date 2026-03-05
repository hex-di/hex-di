# 03 — Adapter Error Handling

Error recovery combinators for fallible adapters. When a factory returns `Result<T, E>` (duck-typed as `{ _tag: "Ok" | "Err" }`), the adapter carries `TError != never`. These combinators wrap the adapter to handle or eliminate the error channel before the adapter is provided to a dependency graph.

## BEH-CO-03-001: adapterOrDie -- throw on error

Wraps a fallible adapter so that `Err` results are thrown as exceptions. The returned adapter has `TError = never`, making it compatible with `GraphBuilder.provide()`.

```ts
function adapterOrDie<
  TProvides,
  TRequires,
  TLifetime extends string,
  TFactoryKind extends FactoryKind,
  TClonable extends boolean,
  TRequiresTuple extends readonly unknown[],
  TError,
>(
  adapter: Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable, TRequiresTuple, TError>
): Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable, TRequiresTuple, never>;
```

**Exported from**: `adapters/unified.ts`, re-exported from `index.ts`

**Algorithm**:

1. Capture the original factory from the adapter.
2. Build a wrapped factory:
   - **Async path** (`factoryKind === "async"`): `await` the original factory, then pass the result to `unwrapResultOrDie`.
   - **Sync path**: invoke the original factory. If the return is a thenable (e.g., `ResultAsync`), chain `.then(unwrapResultOrDie)`. Otherwise call `unwrapResultOrDie` directly.
3. `unwrapResultOrDie(raw)`: if `raw` is result-like (`{ _tag: "Ok" | "Err" }`), return `raw.value` on `Ok`, throw `raw.error` on `Err`. If not result-like, return `raw` unchanged.
4. Clone the adapter with the wrapped factory via `cloneAdapterWithFactory`. Preserve `provides`, `requires`, `lifetime`, `factoryKind`, `clonable`, and `finalizer`.
5. `Object.freeze()` the new adapter.

**Behavior Table**:

| Factory returns                       | adapterOrDie result            |
| ------------------------------------- | ------------------------------ |
| `{ _tag: "Ok", value: svc }`          | `svc` (unwrapped)              |
| `{ _tag: "Err", error: e }`           | throws `e`                     |
| `plainValue` (not result-like)        | `plainValue` (passthrough)     |
| `Promise<{ _tag: "Ok", value: svc }>` | `svc` (async unwrap)           |
| `ResultAsync` (thenable)              | chains `.then()`, then unwraps |

**Example**:

```ts
import { port, createAdapter, adapterOrDie } from "@hex-di/core";

interface Database {
  query(sql: string): Promise<unknown>;
}
type DbError = { _tag: "ConnectionFailed"; reason: string };

const DbPort = port<Database>()({ name: "Database" });

const FallibleDbAdapter = createAdapter({
  provides: DbPort,
  factory: (): { _tag: "Ok"; value: Database } | { _tag: "Err"; error: DbError } => connectToDb(),
});
// FallibleDbAdapter has TError = DbError

const SafeDbAdapter = adapterOrDie(FallibleDbAdapter);
// SafeDbAdapter has TError = never -- throws on connection failure
```

**Design notes**:

- `adapterOrDie` is the simplest error strategy: convert all `Err` into thrown exceptions. Use when factory failures are truly unrecoverable.
- The thenable check (`isThenable`) handles `ResultAsync` objects from `@hex-di/result` without a direct dependency. It detects any object with a `.then()` method and chains through `Promise.resolve()`.
- Cross-ref: [INV-CO-6](../invariants.md#inv-co-6-error-objects-are-frozen), [INV-CO-7](../invariants.md#inv-co-7-factory-errors-flow-through-result).

## BEH-CO-03-002: adapterOrElse -- fallback on error

Wraps a fallible primary adapter with an infallible fallback adapter. On `Err`, the fallback factory is invoked instead. Both adapters must provide the same port. Requirements from both are merged.

```ts
function adapterOrElse<
  TProvides,
  TRequires1, TLifetime1 extends string, TFactoryKind1 extends FactoryKind,
  TClonable1 extends boolean, TRequiresTuple1 extends readonly unknown[], TError,
  TRequires2, TLifetime2 extends string, TFactoryKind2 extends FactoryKind,
  TClonable2 extends boolean, TRequiresTuple2 extends readonly unknown[],
>(
  adapter: Adapter<TProvides, TRequires1, TLifetime1, TFactoryKind1, TClonable1, TRequiresTuple1, TError>,
  fallback: Adapter<TProvides, TRequires2, TLifetime2, TFactoryKind2, TClonable2, TRequiresTuple2, never>,
): Adapter<
  TProvides,
  TRequires1 | TRequires2,
  TLifetime1,
  /* async if either is async */ ...,
  TClonable1,
  readonly [...TRequiresTuple1, ...TRequiresTuple2],
  never
>;
```

**Exported from**: `adapters/unified.ts`, re-exported from `index.ts`

**Algorithm**:

1. Capture primary and fallback factories.
2. Determine if merged adapter is async: `primaryKind === "async" || fallbackKind === "async"`.
3. Build wrapped factory:
   - Invoke primary factory. Resolve if thenable.
   - If result is `{ _tag: "Err" }`: invoke fallback factory. Resolve if thenable. Unwrap if result-like.
   - If result is `{ _tag: "Ok" }` or non-result: unwrap and return.
4. Merge `requires` arrays: iterate both, dedup by `__portName` (first occurrence wins), produce merged array.
5. Build result adapter with primary's `provides`, `lifetime`, `clonable`, and merged `requires`.
6. If primary has a `finalizer`, preserve it.
7. `Object.freeze()` and return.

**Behavior Table**:

| Primary returns | Fallback returns  | Combined result |
| --------------- | ----------------- | --------------- |
| `Ok(svc)`       | (not called)      | `svc`           |
| `Err(e)`        | `plainValue`      | `plainValue`    |
| `Err(e)`        | `Ok(fallbackSvc)` | `fallbackSvc`   |
| `plainValue`    | (not called)      | `plainValue`    |

**Example**:

```ts
import { port, createAdapter, adapterOrElse } from "@hex-di/core";

interface Cache {
  get(key: string): string | null;
}
type RedisError = { _tag: "RedisError"; message: string };

const CachePort = port<Cache>()({ name: "Cache" });

const RedisAdapter = createAdapter({
  provides: CachePort,
  factory: (): { _tag: "Ok"; value: Cache } | { _tag: "Err"; error: RedisError } =>
    connectToRedis(),
});

const InMemoryAdapter = createAdapter({
  provides: CachePort,
  factory: () => new InMemoryCache(),
});

const ResilientCacheAdapter = adapterOrElse(RedisAdapter, InMemoryAdapter);
// TError = never, requires merged from both adapters
```

**Design notes**:

- The fallback adapter must be infallible (`TError = never`). This ensures the combined adapter is also infallible.
- Requirements dedup uses `__portName` as the key. If both adapters require the same port, it appears once in the merged array.
- The primary's `lifetime` and `clonable` are used for the result. The fallback's lifetime is not considered.
- `factoryKind` is `"async"` if either adapter is async. This correctly handles mixed sync/async pairs.
- Cross-ref: [INV-CO-6](../invariants.md#inv-co-6-error-objects-are-frozen), [INV-CO-7](../invariants.md#inv-co-7-factory-errors-flow-through-result).

## BEH-CO-03-003: adapterOrHandle -- custom error handler with tag-selective recovery

Wraps a fallible adapter with a partial handler map keyed by `_tag` values. Matched tags are recovered; unmatched tags propagate as `Err`. The returned adapter's `TError` is narrowed via `Exclude<TError, { _tag: keyof Handlers }>`.

```ts
function adapterOrHandle<
  TProvides,
  TRequires,
  TLifetime extends string,
  TFactoryKind extends FactoryKind,
  TClonable extends boolean,
  TRequiresTuple extends readonly unknown[],
  TError extends { _tag: string },
  Handlers extends Partial<{
    [K in TError["_tag"]]: (
      error: Extract<TError, { _tag: K }>
    ) => FactoryResult<InferService<TProvides>, never>;
  }>,
>(
  adapter: Adapter<
    TProvides,
    TRequires,
    TLifetime,
    TFactoryKind,
    TClonable,
    TRequiresTuple,
    TError
  >,
  handlers: Handlers
): Adapter<
  TProvides,
  TRequires,
  TLifetime,
  TFactoryKind,
  TClonable,
  TRequiresTuple,
  Exclude<TError, { _tag: keyof Handlers & string }>
>;
```

**Exported from**: `adapters/unified.ts`, re-exported from `index.ts`

**Algorithm**:

1. Capture the original factory.
2. Build `handleResultWithHandlers(raw)`:
   - If `raw` is `{ _tag: "Err" }`:
     - Extract `raw.error`. Check if error has a string `_tag` property (`hasStringTag`).
     - If `error._tag in handlers`: invoke `handlers[error._tag](error)`. Unwrap the handler's result.
     - If no matching handler: return `raw` unchanged (error propagates).
   - If `raw` is `{ _tag: "Ok" }` or non-result: unwrap and return.
3. Build wrapped factory:
   - **Async path**: `await` original factory, then `handleResultWithHandlers`.
   - **Sync path**: invoke factory. If thenable, chain `.then(handleResultWithHandlers)`. Otherwise call directly.
4. Clone adapter with wrapped factory via `cloneAdapterWithFactory`.
5. `Object.freeze()` and return.

**Behavior Table**:

| Factory error `_tag` | Handler present | Result                                       |
| -------------------- | --------------- | -------------------------------------------- |
| `"ConfigMissing"`    | Yes             | handler invoked, `Ok` value extracted        |
| `"AuthError"`        | No              | `Err({ _tag: "AuthError", ... })` propagated |
| (non-tagged error)   | N/A             | `Err(error)` propagated                      |
| `Ok(svc)`            | N/A             | `svc` returned                               |

**Example**:

```ts
import { port, createAdapter, adapterOrHandle, adapterOrDie } from "@hex-di/core";

interface Service {
  run(): void;
}

type MyErrors =
  | { _tag: "ConfigMissing"; path: string }
  | { _tag: "ConnectionFailed"; reason: string }
  | { _tag: "AuthError"; code: number };

const ServicePort = port<Service>()({ name: "Service" });

const FallibleAdapter = createAdapter({
  provides: ServicePort,
  factory: (): { _tag: "Ok"; value: Service } | { _tag: "Err"; error: MyErrors } => buildService(),
});
// TError = MyErrors (3 variants)

const PartiallyHandled = adapterOrHandle(FallibleAdapter, {
  ConfigMissing: _err => ({ _tag: "Ok" as const, value: defaultService }),
  ConnectionFailed: _err => ({ _tag: "Ok" as const, value: fallbackService }),
});
// TError = { _tag: "AuthError"; code: number }
// ConfigMissing and ConnectionFailed are eliminated from the error union

// Chain with adapterOrDie for remaining errors:
const SafeAdapter = adapterOrDie(PartiallyHandled);
// TError = never
```

**Design notes**:

- Handlers are partial: you can handle some error variants and let others propagate. This enables incremental error recovery.
- Each handler must return `FactoryResult<InferService<TProvides>, never>` -- an `Ok` result containing the service value. This ensures handled errors do not re-enter the error channel.
- `hasStringTag(error)` checks `typeof error === "object" && error !== null && "_tag" in error && typeof error._tag === "string"`. Errors without a `_tag` property are never matched.
- The `Exclude<TError, { _tag: keyof Handlers & string }>` type narrowing mirrors `catchTag` from `@hex-di/result` (BEH-15-001). The adapter-level and result-level error elimination patterns are intentionally symmetric.
- Cross-ref: [INV-CO-6](../invariants.md#inv-co-6-error-objects-are-frozen), [INV-CO-7](../invariants.md#inv-co-7-factory-errors-flow-through-result).
