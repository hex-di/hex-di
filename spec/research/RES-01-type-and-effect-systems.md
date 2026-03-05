---
id: RES-01
kind: research
title: "Type and Effect Systems for Error Handling Ergonomics"
status: Accepted
date: 2026-03-03
outcome: adr
related_adr: [ADR-014, ADR-015]
---

# RES-01: Type and Effect Systems for Error Handling Ergonomics

## Executive Summary

`Result<T, E>` in `@hex-di/result` already functions as a lightweight type-and-effect system:

- **E is the effect set** — the union of possible error types
- **`never` is pure** — `Result<T, never>` cannot fail
- **Union `|` is effect composition** — `andThen` accumulates `E | F`

The missing piece is **effect elimination**: the ability to handle one error tag at a time and have the type system narrow `E` accordingly. This research identifies `catchTag`, `catchTags`, and `andThenWith` as the minimal primitives to close that gap.

```
Before (orElse — handles all errors uniformly):

  Result<T, A | B | C>
          │
    orElse(handler)          ← must handle ALL of A | B | C
          │
  Result<T | U, F>           ← E fully replaced

After (catchTag — per-tag elimination):

  Result<T, A | B | C>
          │
    catchTag("A", handler)   ← handles only A
          │
  Result<T | T2, B | C>      ← A removed from error set
          │
    catchTag("B", handler)   ← handles only B
          │
  Result<T | T2 | T3, C>     ← B removed too
```

## Research Findings

### Finding 1: Gifford & Lucassen (1986) — Integrating Functional and Imperative Programming

**Theoretical insight**: Effects can be tracked in the type system as sets. Operations that introduce effects expand the set; handlers that discharge effects shrink it.

**hex-di diagnosis**: `andThen` expands `E` via `E | F`. But no operation shrinks `E` by handling a specific member.

**Proposed improvement**: `catchTag` uses `Exclude<E, { _tag: Tag }>` to shrink the error union one tag at a time.

### Finding 2: Wadler (1995) — Monads for Functional Programming

**Theoretical insight**: Monadic bind (`>>=`) is the core composition operator. Error monads (`Either`) support uniform error handling via `catchError`.

**hex-di diagnosis**: `orElse` is the `catchError` equivalent but handles all errors uniformly — no selective recovery.

**Proposed improvement**: `catchTag` adds selective bind-with-recovery, analogous to pattern-matching on specific error constructors in Haskell.

### Finding 3: Plotkin & Pretnar (2009) — Handlers of Algebraic Effects

**Theoretical insight**: Effect handlers are compositional — each handler eliminates one effect from the row, leaving the rest for outer handlers.

**hex-di diagnosis**: No compositional handler mechanism exists. `orElse` is monolithic.

**Proposed improvement**: Chained `catchTag` calls mirror layered effect handlers: each call peels off one error variant.

### Finding 4: Leijen/Koka (2014) — Type Directed Compilation of Row-Typed Algebraic Effects

**Theoretical insight**: Row typing enables open effect sets where individual effects can be added or removed without affecting others.

**hex-di diagnosis**: TypeScript's union types naturally provide open rows. `Exclude` provides the removal operation.

**Proposed improvement**: `Exclude<E, { _tag: Tag }>` is the TypeScript encoding of row-based effect elimination.

### Finding 5: Bauer & Pretnar (2015) — Programming with Algebraic Effects and Handlers (Eff)

**Theoretical insight**: Handlers specify clauses for specific operations. Unhandled operations propagate to enclosing handlers.

**hex-di diagnosis**: No clause-per-operation pattern exists for error recovery.

**Proposed improvement**: `catchTags` accepts a handler map (`{ TagA: handler, TagB: handler }`) — each entry is a clause. Unhandled tags propagate.

### Finding 6: Convent et al. (2020) — Effect Handlers in Scope

**Theoretical insight**: Scoped effect handlers ensure handlers only apply within a lexical scope, preventing unintended capture.

**hex-di diagnosis**: Method chaining provides natural scoping — each `catchTag` only applies to the error from its position in the chain.

**Proposed improvement**: No additional scoping needed; method chaining inherently provides positional scoping.

### Finding 7: Lindley, McBride & McLaughlin (2017) — Do Be Do Be Do

**Theoretical insight**: Algebraic effects support both "doing" (performing effects) and "being" (handling them) in a unified framework.

**hex-di diagnosis**: `andThen` is the "do" (introduce errors). Missing: the "be" (handle errors selectively).

**Proposed improvement**: `andThenWith(onOk, onErr)` combines both — "do" new work via `onOk`, "be" a handler via `onErr`.

### Finding 8: Kammar, Lindley & Oury (2013) — Handlers in Action

**Theoretical insight**: Practical effect handler systems need both deep and shallow handlers. Shallow handlers handle one occurrence and return.

**hex-di diagnosis**: `catchTag` is a shallow handler — handles one error tag and returns, leaving the pipeline to continue.

**Proposed improvement**: The shallow handler model matches `catchTag` semantics exactly.

### Finding 9: Biernacki et al. (2019) — Abstracting Algebraic Effects

**Theoretical insight**: Effect polymorphism allows functions to be generic over their effect requirements, enabling reuse across different effect environments.

**hex-di diagnosis**: TypeScript generics already provide effect polymorphism — `<E>` in function signatures.

**Proposed improvement**: No change needed; TypeScript generics already support this pattern. The new methods preserve it.

### Finding 10: Plotkin & Power (2003) — Algebraic Operations and Generic Effects

**Theoretical insight**: Effects form a semilattice under composition. The identity element is the empty effect (no errors).

**hex-di diagnosis**: `never` is the identity (empty error set). Union `|` is the join. But there's no meet (intersection/elimination).

**Proposed improvement**: `Exclude` provides the meet operation, completing the semilattice structure.

## Three-Tier Improvement Roadmap

### Tier 1: Effect Elimination Primitives (This Phase)

```
catchTag(tag, handler)    — eliminate one error variant
catchTags({...handlers})  — eliminate multiple error variants
andThenWith(onOk, onErr)  — combined bind + full error recovery
```

Implemented as methods on `Ok`, `Err`, and `ResultAsync`, plus standalone curried functions.

### Tier 2: Adapter Error Handlers (Future — ADR-015)

```
adapterOrHandle(adapter, {
  NotFound: (e) => ok(defaultValue),
  Timeout: (e) => ok(cachedValue),
})
```

Integration with `@hex-di/core` adapter composition. Allows per-tag error handling at the adapter boundary.

### Tier 3: Type-Level Error Utilities (Future)

```
TaggedError<Tag, Fields>     — branded tagged error type constructor
ErrorRow<A | B | C>          — type-level error row operations
ExhaustiveHandler<E>         — ensures all tags handled (E → never)
```

## Risk Assessment

| Risk                                                            | Likelihood | Impact | Mitigation                                             |
| --------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| TypeScript inference regression on complex Exclude chains       | Low        | Medium | Comprehensive type-level tests                         |
| Handler return type confusion (must return `Result<T2, never>`) | Medium     | Low    | Clear documentation, JSDoc examples                    |
| Performance overhead from `_tag` runtime checks                 | Low        | Low    | Same cost as existing discriminant checks              |
| Breaking change to error types without `_tag`                   | N/A        | N/A    | Non-tagged errors skip catchTag silently (return self) |

## Trade-offs

1. **Handler infallibility**: Handlers must return `Result<T2, never>` (infallible). This simplifies type narrowing significantly — if handlers could fail, the eliminated tag might re-enter the error union.

2. **Runtime `_tag` checking**: `catchTag` performs runtime `"_tag" in error` checks. This is the same cost as existing discriminant checks in `isOk()`/`isErr()`.

3. **Non-tagged error passthrough**: If `E` contains non-tagged errors (e.g., `string`), `catchTag` passes them through unchanged. This is safe but means `catchTag` cannot handle non-discriminated errors.
