# Concepts

This document maps the conceptual relationships in `@hex-di/graph` to help both humans and AI understand how pieces fit together.

## Core Concept Hierarchy

```
                              @hex-di/ports
                                   │
                                   ▼
                              ┌─────────┐
                              │  Port   │  (interface contract)
                              └────┬────┘
                                   │
                                   ▼
                              ┌─────────┐
                              │ Adapter │  (implementation binding)
                              └────┬────┘
                                   │
                                   ▼
                           ┌──────────────┐
                           │ GraphBuilder │  (accumulator + validator)
                           └──────┬───────┘
                                  │
                                  ▼
                              ┌─────────┐
                              │  Graph  │  (frozen configuration)
                              └────┬────┘
                                   │
                                   ▼
                             @hex-di/runtime
                              (Container)
```

## Concept Definitions

| Concept          | What It Is                                      | What It Does                                    |
| ---------------- | ----------------------------------------------- | ----------------------------------------------- |
| **Port**         | A branded type representing a service interface | Defines the contract (type signature)           |
| **Adapter**      | A frozen object binding port to implementation  | Holds factory, lifetime, and dependencies       |
| **GraphBuilder** | An immutable builder with type-state            | Accumulates adapters, validates at compile time |
| **Graph**        | A frozen collection of validated adapters       | Passed to runtime for container creation        |
| **Container**    | Runtime service resolver (in @hex-di/runtime)   | Creates and caches service instances            |

## Validation Concept Flow

```
                 ┌─────────────────────────────────────────────┐
                 │           GraphBuilder.provide(adapter)      │
                 └─────────────────────────────────────────────┘
                                        │
                                        ▼
           ┌────────────────────────────────────────────────────┐
           │                  CheckDuplicate                    │
           │  "Does this port already have an adapter?"         │
           └───────────────────────┬───────────────────────────┬┘
                                   │ No                        │ Yes
                                   ▼                           ▼
           ┌────────────────────────────────────────┐   ┌──────────────┐
           │           CheckCycleDependency         │   │  HEX001 Error │
           │  "Would adding this create a cycle?"   │   └──────────────┘
           └──────────────────┬────────────────────┬┘
                              │ No                 │ Yes
                              ▼                    ▼
           ┌────────────────────────────────────────┐   ┌──────────────┐
           │        CheckCaptiveDependency          │   │  HEX002 Error │
           │  "Does lifetime hierarchy allow this?" │   └──────────────┘
           └──────────────────┬────────────────────┬┘
                              │ Yes                │ No
                              ▼                    ▼
           ┌────────────────────────────────────────┐   ┌──────────────┐
           │          ProvideResultSuccess          │   │  HEX003 Error │
           │  "Return new GraphBuilder with updated │   └──────────────┘
           │   TProvides, TRequires, TInternalState"│
           └────────────────────────────────────────┘
```

## Lifetime Hierarchy

Lifetimes have a strict hierarchy that prevents "captive dependencies" (shorter-lived services captured by longer-lived ones).

```
    ┌─────────────┐
    │  Singleton  │  Level 1 - Longest lived
    │  (one per   │  ✓ Can depend on: Singleton only
    │  container) │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Scoped    │  Level 2 - Medium lived
    │  (one per   │  ✓ Can depend on: Singleton, Scoped
    │   scope)    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Transient  │  Level 3 - Shortest lived
    │  (new each  │  ✓ Can depend on: Singleton, Scoped, Transient
    │   request)  │
    └─────────────┘
```

**Rule**: A service can only depend on services with **equal or longer** lifetimes.

| Dependent Lifetime | Can Depend On                |
| ------------------ | ---------------------------- |
| Singleton (1)      | Singleton only               |
| Scoped (2)         | Singleton, Scoped            |
| Transient (3)      | Singleton, Scoped, Transient |

## Decision Trees

### Which `provide` Method Should I Use?

```
                    ┌─────────────────────────────┐
                    │  What type of adapter?      │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────┴───────┐           ┌───────┴───────┐
            │  Sync factory │           │ Async factory │
            │  (no await)   │           │  (returns     │
            └───────┬───────┘           │   Promise)    │
                    │                   └───────┬───────┘
                    │                           │
                    ▼                           ▼
    ┌───────────────────────────────┐   ┌─────────────────┐
    │ How many errors do you want   │   │ provideAsync()  │
    │ to see at once?               │   │                 │
    └───────────────┬───────────────┘   └─────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
    ┌───┴───┐               ┌───┴───────────┐
    │ All   │               │ First only    │
    │ errors│               │ (faster types)│
    └───┬───┘               └───────┬───────┘
        │                           │
        ▼                           ▼
┌───────────────┐           ┌──────────────────┐
│  provide()    │           │ provideFirstError│
│  (DEFAULT)    │           │ ()               │
└───────────────┘           └──────────────────┘
```

### How Do I Break a Circular Dependency?

```
                    ┌─────────────────────────────┐
                    │  Circular dependency        │
                    │  detected (HEX002)          │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  Is it a legitimate bidirec-│
                    │  tional relationship?       │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────┴───────┐           ┌───────┴───────┐
            │      Yes      │           │      No       │
            │ (e.g., User ↔ │           │ (design smell)│
            │  Notification)│           └───────┬───────┘
            └───────┬───────┘                   │
                    │                           ▼
                    ▼               ┌─────────────────────────────┐
    ┌───────────────────────────┐   │  Refactor your architecture │
    │  Use lazyPort() on one    │   │                             │
    │  direction                │   │  • Extract shared logic to  │
    │                           │   │    a third service          │
    │  requires: [              │   │  • Invert the dependency    │
    │    lazyPort(UserService)  │   │  • Use events/messaging     │
    │  ] as const               │   └─────────────────────────────┘
    └───────────────────────────┘
```

### When Should I Use `override()` vs `provide()`?

```
                    ┌─────────────────────────────┐
                    │  Am I adding an adapter?    │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  Is there a parent graph    │
                    │  (using forParent)?         │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────┴───────┐           ┌───────┴───────┐
            │      No       │           │      Yes      │
            │ (root graph)  │           │ (child graph) │
            └───────┬───────┘           └───────┬───────┘
                    │                           │
                    ▼                           ▼
    ┌───────────────────────────┐   ┌─────────────────────────────┐
    │  Use provide()            │   │  Does parent provide this   │
    │  (always for root graphs) │   │  port already?              │
    └───────────────────────────┘   └─────────────┬───────────────┘
                                                  │
                                    ┌─────────────┴─────────────┐
                                    │                           │
                            ┌───────┴───────┐           ┌───────┴───────┐
                            │      No       │           │      Yes      │
                            │ (new service) │           │ (replacement) │
                            └───────┬───────┘           └───────┬───────┘
                                    │                           │
                                    ▼                           ▼
                    ┌───────────────────────────┐   ┌───────────────────────────┐
                    │  Use provide()            │   │  Use override()           │
                    │  (extends parent)         │   │  (replaces parent's       │
                    └───────────────────────────┘   │   implementation)         │
                                                   └───────────────────────────┘
```

## Type-Level Concept Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GraphBuilder Type Parameters                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  GraphBuilder<TProvides, TRequires, TAsyncPorts, TOverrides, TInternal> │
│       │           │           │           │           │                 │
│       │           │           │           │           └─► BuilderInternals
│       │           │           │           │               ├─► depGraph   │
│       │           │           │           │               ├─► lifetimeMap│
│       │           │           │           │               ├─► parentProvides
│       │           │           │           │               └─► maxDepth   │
│       │           │           │           │                              │
│       │           │           │           └─► Ports marked for override  │
│       │           │           │               (in child graphs)          │
│       │           │           │                                          │
│       │           │           └─► Ports with async factories             │
│       │           │               (need container.initialize())          │
│       │           │                                                      │
│       │           └─► Ports required by adapters but not yet provided    │
│       │               (grows with each provide, shrinks as satisfied)    │
│       │                                                                  │
│       └─► Ports that have adapters registered                            │
│           (grows with each provide)                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                              At build() time:
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  UnsatisfiedDependencies<     │
                    │    TProvides, TRequires       │
                    │  > extends never ?            │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────┴───────┐               ┌───────┴───────┐
            │   Yes (never) │               │   No (ports)  │
            └───────┬───────┘               └───────┬───────┘
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │  Graph<TProvides, ...>    │   │  "ERROR[HEX008]: Missing  │
    │  (frozen, ready to use)   │   │   adapters for ..."       │
    └───────────────────────────┘   └───────────────────────────┘
```

## Module Responsibility Map

| Module           | Responsibility                      | Key Types                                      |
| ---------------- | ----------------------------------- | ---------------------------------------------- |
| `adapter/`       | Define and create adapters          | `Adapter`, `AdapterAny`, `createAdapter`       |
| `builder-types/` | Type-level validation orchestration | `ProvideResult`, `MergeResult`                 |
| `validation/`    | Pure validation algorithms          | `WouldCreateCycle`, `FindAnyCaptiveDependency` |
| `graph/`         | GraphBuilder class and Graph type   | `GraphBuilder`, `Graph`, `inspect()`           |
| `common/`        | Shared type utilities               | `IsNever`, `Prettify`                          |

## See Also

- [GLOSSARY.md](./GLOSSARY.md) - Term definitions
- [CONVENTIONS.md](./CONVENTIONS.md) - Naming and coding patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Design decisions
- [docs/typescript-patterns.md](./docs/typescript-patterns.md) - Type-level programming
