# Phase 10: Async Lifetime Enforcement - Context

## Goal

Users receive compile-time errors when combining async factories with non-singleton lifetimes.

## Requirements

- **ASYNC-01**: Async factory with `lifetime: 'scoped'` produces compile error
- **ASYNC-02**: Async factory with `lifetime: 'transient'` produces compile error
- **ASYNC-03**: Async factory with `lifetime: 'singleton'` compiles successfully
- **ASYNC-04**: Async factory with lifetime omitted compiles (defaults to singleton)
- **ASYNC-05**: Error type includes helpful message and hint

## Current State

The unified `createAdapter()` from Phase 9 already:

1. Detects async factories via `IsAsyncFactory<TFactory>` type helper
2. Silently forces `Singleton` lifetime for async factories in return type
3. Does NOT produce compile errors when user specifies non-singleton lifetime

Current overload behavior (from unified.ts lines 340-347):

```typescript
Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  IsAsyncFactory<TFactory> extends true ? Singleton : TLifetime, // Silent override
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  False,
  TRequires extends readonly Port<unknown, string>[] ? TRequires : EmptyRequires
>;
```

## Problem

When a user writes:

```typescript
createAdapter({
  provides: MyPort,
  lifetime: "scoped", // User's intent
  factory: async () => new MyService(),
});
```

The return type silently becomes `Adapter<..., "singleton", ...>` instead of producing a compile error. The user's explicit `lifetime: 'scoped'` is ignored without any compile-time feedback.

## Solution Approach

Use conditional types to return branded error types when async + non-singleton:

```typescript
type EnforceAsyncLifetime<TFactory, TLifetime> =
  IsAsyncFactory<TFactory> extends true
    ? TLifetime extends "singleton"
      ? TLifetime
      : AsyncLifetimeError<TLifetime>
    : TLifetime;
```

Where `AsyncLifetimeError<T>` is a branded type like:

```typescript
type AsyncLifetimeError<L> =
  `Async factories must use 'singleton' lifetime. Got: '${L}'. Hint: Remove the lifetime property to use the default 'singleton', or make the factory synchronous.`;
```

## Technical Considerations

1. **Overload Selection**: TypeScript selects overloads top-to-bottom. Overloads with `lifetime?: undefined` should work for async factories (ASYNC-04).

2. **Error Position**: The error should appear in the return type, making the adapter unusable without fixing the lifetime.

3. **Type Test Strategy**: Use `expectTypeOf<...>().toEqualTypeOf<ErrorString>()` patterns.

## Dependencies

- Phase 9 (complete) - unified createAdapter exists with async detection

## Success Metrics

1. `createAdapter({ provides: P, factory: async () => x, lifetime: 'scoped' })` - compile error
2. `createAdapter({ provides: P, factory: async () => x, lifetime: 'transient' })` - compile error
3. `createAdapter({ provides: P, factory: async () => x, lifetime: 'singleton' })` - compiles
4. `createAdapter({ provides: P, factory: async () => x })` - compiles (default singleton)
5. Error message is clear and actionable
