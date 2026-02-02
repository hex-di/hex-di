---
phase: 04-api-ergonomics
plan: 01
title: ServiceBuilder Fluent API
status: complete
subsystem: core/adapters

# Dependencies
requires: []
provides:
  - ServiceBuilder class with fluent API
  - Immutable builder pattern with phantom types
  - curried create<TService>()(name) factory
affects:
  - 04-02 (Service function convenience wrapper)
  - API ergonomics across entire codebase

# Technical
tech-stack:
  added: []
  patterns:
    - Immutable fluent builder
    - Phantom type state machine
    - Curried partial type application

key-files:
  created:
    - packages/core/src/adapters/builder.ts
  modified:
    - packages/core/src/adapters/index.ts
    - packages/core/src/index.ts

decisions:
  - id: curried-create
    choice: Curried create<TService>()(name) pattern
    rationale: Enables partial type application - service type is explicit, name is inferred
  - id: immutable-pattern
    choice: Object.freeze(this) in constructor
    rationale: Matches GraphBuilder pattern, ensures builder instances are immutable

metrics:
  duration: 4 min
  completed: 2026-02-01
tags:
  - builder-pattern
  - phantom-types
  - fluent-api
  - api-ergonomics
---

# Phase 4 Plan 01: ServiceBuilder Fluent API Summary

**One-liner:** ServiceBuilder class with immutable fluent API using phantom types and curried factory pattern

## What Was Built

Created the `ServiceBuilder` class that enables fluent method chaining for service definition:

```typescript
// Simple service (no dependencies, singleton default)
const [LoggerPort, LoggerAdapter] = ServiceBuilder.create<Logger>()("Logger").factory(
  () => new ConsoleLogger()
);

// With dependencies and custom lifetime
const [UserServicePort, UserServiceAdapter] = ServiceBuilder.create<UserService>()("UserService")
  .scoped()
  .requires(LoggerPort, DatabasePort)
  .factory(({ Logger, Database }) => new UserServiceImpl(Logger, Database));
```

### Key Features

1. **Curried Factory Pattern**: `create<TService>()(name)` enables partial type application
   - Service type is explicitly specified
   - Port name is inferred as literal type from string argument

2. **Phantom Type State Machine**: 4 type parameters track builder state at compile time
   - `TService`: The service interface type
   - `TName`: Literal string port name
   - `TRequires`: Dependencies as readonly tuple
   - `TLifetime`: Current lifetime setting

3. **Immutable Builder**: Each method returns a NEW frozen instance
   - `Object.freeze(this)` in constructor
   - Follows GraphBuilder pattern

4. **Lifetime Methods**: `singleton()`, `scoped()`, `transient()`
   - Each returns new builder with updated `TLifetime`
   - Uses existing literal constants for type narrowing

5. **Factory Terminal**: `factory(fn)` produces `readonly [Port, Adapter]` tuple
   - Same output type as `defineService()`
   - Factory function receives properly typed `deps` object

## Files Changed

| File                                    | Change                                     |
| --------------------------------------- | ------------------------------------------ |
| `packages/core/src/adapters/builder.ts` | Created - ServiceBuilder class (268 lines) |
| `packages/core/src/adapters/index.ts`   | Added ServiceBuilder export                |
| `packages/core/src/index.ts`            | Added ServiceBuilder export                |

## Commits

| Hash    | Description                                    |
| ------- | ---------------------------------------------- |
| e976a9f | Create ServiceBuilder class with phantom types |
| eedf739 | Export ServiceBuilder from core package        |

## Verification Results

- `pnpm typecheck`: All 13 packages pass
- `pnpm lint` (core): No errors
- Type inference verified through manual type tests

## API Comparison

| Feature        | defineService       | ServiceBuilder           |
| -------------- | ------------------- | ------------------------ |
| Type params    | `<TName, TService>` | `<TService>()` (curried) |
| Name inference | Explicit            | Automatic                |
| Lifetime       | Config object       | Method chaining          |
| Dependencies   | Config object       | `.requires()`            |
| Defaults       | Config-based        | Singleton, no deps       |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 04-02: `service()` function that wraps ServiceBuilder for even more concise syntax:

```typescript
// Target API for 04-02
const [LoggerPort, LoggerAdapter] = service<Logger>("Logger", () => new ConsoleLogger());
```
