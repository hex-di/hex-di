---
phase: 04-api-ergonomics
plan: 02
subsystem: adapters
tags: [fluent-api, builder-pattern, class-injection, defineService]

dependency-graph:
  requires:
    - 04-01 (ServiceBuilder class)
  provides:
    - defineService() builder overload
    - fromClass() helper function
  affects:
    - 04-03 (wave 3 APIs)
    - User-facing API documentation

tech-stack:
  added: []
  patterns:
    - Function overloads for phantom type bridging
    - Curried type application pattern

key-files:
  created:
    - packages/core/src/adapters/from-class.ts
  modified:
    - packages/core/src/adapters/service.ts
    - packages/core/src/index.ts

decisions:
  - id: curried-define-service
    choice: "defineService<T>()('name') curried pattern"
    reason: "Consistent with existing port() and ServiceBuilder.create() APIs"
  - id: phantom-type-bridging
    choice: "Function overloads instead of type casts"
    reason: "Follows established codebase pattern (unsafeCreatePort), avoids forbidden casts"
  - id: class-constructor-storage
    choice: "Store class as loose type internally, use overloads for public API"
    reason: "TypeScript cannot unify InstanceType<T>/ConstructorParameters<T> with original T"

metrics:
  duration: 6 min
  completed: 2026-02-01
---

# Phase 04 Plan 02: Builder Entry Points Summary

defineService() curried builder overload and fromClass() class-based service helper

## What Was Built

### 1. defineService() Builder Overload

Added curried overload to `defineService()` that returns a ServiceBuilder:

```typescript
// New builder API (curried pattern)
const [LoggerPort, LoggerAdapter] = defineService<Logger>()("Logger")
  .singleton()
  .factory(() => new ConsoleLogger());

// Existing config API unchanged
const [ConfigPort, ConfigAdapter] = defineService<"Config", Config>("Config", {
  factory: () => loadConfig(),
});
```

Implementation:

- First overload signature returns `ServiceBuilder<TService, TName, readonly [], "singleton">`
- Implementation checks for `undefined` name argument to branch to builder path
- Early return pattern avoids need for type assertions

### 2. fromClass() Helper Function

Created fluent builder for class-based services with constructor injection:

```typescript
class UserServiceImpl implements UserService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}
}

const [UserPort, UserAdapter] = fromClass(UserServiceImpl)
  .as<UserService>("UserService") // Interface narrowing
  .scoped()
  .requires(DatabasePort, LoggerPort) // Order matches constructor!
  .build();
```

Components:

- `ClassAdapterBuilder<TInstance>` - Initial builder capturing class constructor
- `ClassServiceBuilder<TService, TName, TRequires, TLifetime>` - Configuration builder
- `createClassFactory()` - Internal helper using function overloads to bridge types

## Technical Approach

### Avoiding Type Casts

Per CLAUDE.md rules, no type casts (`as X`) are allowed. The challenge is that TypeScript cannot unify:

- `T extends new (...args: readonly unknown[]) => unknown`
- `new (...args: ConstructorParameters<T>) => InstanceType<T>`

Solution: Function overloads that provide a typed PUBLIC signature while using looser types in the IMPLEMENTATION. This pattern is established in `ports/factory.ts`:

```typescript
// Public signature with phantom types
function createClassFactory<TService, TRequires extends readonly Port<unknown, string>[]>(
  classConstructor: new (...args: readonly unknown[]) => unknown,
  requires: TRequires
): (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;

// Implementation with loose types
function createClassFactory(
  classConstructor: new (...args: readonly unknown[]) => unknown,
  requires: readonly Port<unknown, string>[]
): (deps: Record<string, unknown>) => unknown {
  return deps => {
    const args = extractServicesInOrder(deps, requires);
    return new classConstructor(...args);
  };
}
```

### User Responsibility

The `requires()` method documentation emphasizes that port order must match constructor parameter order. TypeScript cannot verify this relationship - it's a user contract.

## Commits

| Commit  | Type | Description                                        |
| ------- | ---- | -------------------------------------------------- |
| e3e7413 | feat | Add builder overload to defineService()            |
| 3392635 | feat | Create fromClass() helper for class-based services |

## Files Changed

### Created

- `packages/core/src/adapters/from-class.ts` (389 lines)
  - ClassAdapterBuilder class
  - ClassServiceBuilder class
  - fromClass() entry point
  - createClassFactory() helper with overloads

### Modified

- `packages/core/src/adapters/service.ts`
  - Added builder overload signature
  - Modified implementation to handle no-config case
  - Added ServiceBuilder import

- `packages/core/src/index.ts`
  - Added exports: fromClass, ClassAdapterBuilder, ClassServiceBuilder

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes (core package)
- [x] `pnpm test` passes (1844 tests in graph package)
- [x] defineService<T>('name') returns ServiceBuilder
- [x] Existing defineService(name, config) calls work unchanged
- [x] fromClass(Class).as<Interface>('Name').build() returns tuple
- [x] No `any` types or type casts

## API Completeness

| API                              | Status   | Requirement    |
| -------------------------------- | -------- | -------------- |
| defineService() builder overload | Complete | API-01         |
| fromClass() helper               | Complete | API-05, API-06 |
| .as<Interface>() narrowing       | Complete | API-05         |
| .requires() port declaration     | Complete | API-06         |

## Next Phase Readiness

Phase 04 Plan 03 (Wave 3) can proceed:

- require() constraint helper
- override() helper
- asAsync() modifier on builders

No blockers identified.
