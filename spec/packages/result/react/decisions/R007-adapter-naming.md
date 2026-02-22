# ADR-R007: Adapter Naming Convention (`to*`)

## Status

Accepted

## Context

The core library uses `from*` for constructors (`fromPromise`, `fromThrowable`, `fromNullable`) and method names for transformations (`map`, `andThen`, `match`). The React package introduces adapter functions that convert Result types into formats expected by external libraries.

Naming options considered:

1. `resultToQueryFn` — verbose, redundant `result` prefix
2. `asQueryFn` — ambiguous, doesn't communicate conversion
3. `toQueryFn` — concise, communicates direction of conversion
4. `createQueryFn` — implies creating something new, not converting

## Decision

Use the `to*` prefix for all adapter functions:

- `toQueryFn` — converts to TanStack Query `queryFn`
- `toQueryOptions` — converts to TanStack Query options object
- `toMutationFn` — converts to TanStack Query `mutationFn`
- `toMutationOptions` — converts to TanStack Query mutation options
- `toSwrFetcher` — converts to SWR fetcher

This mirrors the core library's `toNullable()`, `toUndefined()`, `toOption()`, `toJSON()`, and `toAsync()` methods, which all use the `to*` prefix for type conversions.

## Consequences

**Positive**:
- Consistent with core library's `to*` conversion pattern
- Clear directionality: `to*` means "convert this Result-world thing _to_ that library's format"
- Complements `from*` constructors: `fromAction` converts _from_ external, `toQueryFn` converts _to_ external

**Negative**:
- The `to*` prefix on standalone functions is new — core library uses it only on instance methods
- Slight ambiguity: `toQueryFn` doesn't indicate the input type

**Trade-off accepted**: The naming is intuitive and consistent with the `from*`/`to*` directionality pattern. The input type is always `ResultAsync`-returning function, which is clear from the type signature.
