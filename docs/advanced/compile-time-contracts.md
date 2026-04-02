---
title: Compile-Time Contracts
description: What type-level safety guarantees HexDI provides and how to leverage them
sidebar_position: 0
---

# Compile-Time Contracts

HexDI validates your dependency graph at compile time. If your code compiles, your graph is structurally correct -- no missing dependencies, no cycles, no lifetime violations. This page explains what you get and how to use it.

> For implementation details behind these guarantees, see [Type-Level Programming Patterns](./type-level-programming.md).

## What the Compiler Catches

### 1. Missing Dependencies

Every required port must be provided before `.build()` succeeds:

```typescript
const builder = GraphBuilder.create().provide(DatabaseAdapter); // requires LoggerPort
//  .build();                  // Type error: LoggerPort is not provided

// Fix: provide the missing adapter
const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build(); // Compiles
```

### 2. Circular Dependencies

If A requires B and B requires A (directly or transitively), the compiler catches it:

```typescript
const graph = GraphBuilder.create()
  .provide(AAdapter) // A requires B
  .provide(BAdapter); // B requires A
//                     ^  ERROR[HEX002]: Circular dependency: A -> B -> A
```

### 3. Captive Dependencies

A singleton must not depend on a scoped or transient service (it would "capture" a short-lived instance):

```typescript
const graph = GraphBuilder.create()
  .provide(SingletonAdapter) // singleton, requires ScopedPort
  .provide(ScopedAdapter); // scoped
//                            ^  ERROR[HEX003]: Captive dependency
```

### 4. Duplicate Adapters

Providing the same port twice is an error:

```typescript
const graph = GraphBuilder.create().provide(LoggerAdapter).provide(AnotherLoggerAdapter);
//                               ^  ERROR[HEX001]: Duplicate adapter for 'Logger'
```

### 5. Phantom Type Safety

Ports with identical interfaces remain type-distinct. You cannot accidentally pass a `LoggerPort` where a `AuditorPort` is expected:

```typescript
const LoggerPort = port<Logger>()({ name: "Logger" });
const AuditorPort = port<Logger>()({ name: "Auditor" });

// These are different types despite identical interfaces
container.resolve(LoggerPort); // Logger instance
container.resolve(AuditorPort); // Auditor instance (different!)
```

## Reading Type Errors

HexDI type errors follow a consistent format:

```
ERROR[HEXnnn]: Description. Fix: Suggestion.
```

### Quick Reference

| Code   | Meaning                 | Fix                                              |
| ------ | ----------------------- | ------------------------------------------------ |
| HEX001 | Duplicate adapter       | Remove duplicate or use `.override()`            |
| HEX002 | Circular dependency     | Break cycle with `lazyPort()` or restructure     |
| HEX003 | Captive dependency      | Align lifetimes or use `lazyPort()`              |
| HEX004 | Reverse captive dep     | Align lifetimes or reorder registration          |
| HEX005 | Lifetime inconsistency  | Ensure same lifetime for same port across merges |
| HEX006 | Invalid override        | Port must exist in parent graph                  |
| HEX007 | Depth limit exceeded    | Use `withMaxDepth<N>()` or restructure graph     |
| HEX009 | Override without parent | Use `forParent(parentGraph)` first               |
| HEX015 | Invalid lifetime value  | Use `'singleton'`, `'scoped'`, or `'transient'`  |

### Example: Decoding a Cycle Error

Your IDE shows:

```
Type '"ERROR[HEX002]: Circular dependency detected: UserService -> Database -> Cache -> UserService.
Fix: Break the cycle by using lazyPort() for one dependency."' is not assignable to type ...
```

Read the path: `UserService -> Database -> Cache -> UserService`. The cycle returns to `UserService`. Break it by making one of those dependencies lazy.

## Key Mechanisms

### Phantom Types (Zero Runtime Cost)

Every port carries a unique brand via `unique symbol`. This brand exists only at the type level -- zero bytes at runtime. It prevents accidental port confusion even when interfaces match structurally.

Branded types are used for:

- **Ports** -- each port has a unique identity (`packages/core/src/ports/`)
- **Adapters** -- adapters carry their port type (`packages/core/src/adapters/`)
- **Timestamps** -- monotonic vs wall-clock timestamps are distinct types (`libs/clock/core/src/branded.ts`)
- **Results** -- `Ok` and `Err` carry brands preventing forgery (`packages/result/src/core/brand.ts`)
- **Permissions/Roles** -- guard tokens are branded (`libs/guard/core/src/tokens/`)

### Type-State Builder

`GraphBuilder` uses phantom type parameters that change with each method call. After `.provide(LoggerAdapter)`, the builder's type encodes that `LoggerPort` is provided. After `.provide(DatabaseAdapter)`, both ports are in the type. The `.build()` method is only available when the type-level dependency check passes.

This is the [type-state pattern](https://docs.google.com/document/d/1dGx5P0L5Ya0wFcl0JJR_0MJxDUKDUEP25DLFqQqxj8A/edit) -- each state transition returns a new type.

### Union Subtraction

TypeScript's `Exclude<TRequired, TProvided>` removes satisfied dependencies from the "required" set. When the set becomes `never`, all dependencies are satisfied and `.build()` compiles.

### Type-Level Graph Traversal

Cycle detection is implemented as recursive conditional types performing DFS over the dependency graph encoded in phantom type parameters. Depth limits prevent TypeScript from hitting its recursion ceiling.

## Type-Level Test Coverage

HexDI maintains **294 `.test-d.ts` files** with over **5,000 type assertions** using `expectTypeOf` from Vitest. These tests verify:

- Correct type inference for every builder method
- Error messages contain the right port names and paths
- Phantom brands prevent unintended type compatibility
- Edge cases (empty graphs, self-dependencies, deep chains)

Example from `packages/graph/tests/circular-dependency.test-d.ts`:

```typescript
it("detects A -> B -> A cycle", () => {
  const result = GraphBuilder.create().provide(AAdapter).provide(BAdapter);

  expectTypeOf(result).toMatchTypeOf<string>(); // Error message string
});
```

## How to Leverage These Guarantees

**Trust the compiler.** If your graph builds without type errors, it is structurally valid. No need for runtime graph validation.

**Read the error messages.** HEX errors include the specific port names, cycle paths, and fix suggestions. They're designed to be actionable.

**Use type-driven development.** Define ports first, then add adapters. Let type errors guide you to provide missing dependencies.

**Don't bypass the type system.** Avoid `as any` on graph builders or adapters -- it defeats the compile-time guarantees.

## References

- [Type-Level Programming Patterns](./type-level-programming.md) -- internal implementation details
- [GraphBuilder Type-State Pattern](https://github.com/leaderiop/hex-di/blob/main/packages/graph/docs/TYPE_STATE_PATTERN.md) -- detailed builder internals
- [Debugging Guide](https://github.com/leaderiop/hex-di/blob/main/packages/graph/docs/DEBUGGING.md) -- full error code reference
