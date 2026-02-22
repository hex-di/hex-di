---
title: HexDI Documentation
description: HexDI makes your dependency graph structurally correct by construction — compile-time architectural validation for TypeScript applications.
sidebar_position: 1
sidebar_label: Overview
---

# HexDI Documentation

AI writes code faster than architects can review it. HexDI solves the review problem structurally — the compiler is the architect.

When AI tools generate code, they produce architecturally plausible output that may be silently wrong: a circular dependency that fails at runtime, a scoped service resolved without a scope, a port that was supposed to be abstract now accessed directly. These errors don't show up in a linter, a formatter, or a standard code review. They show up in production.

HexDI catches them before the code builds.

```typescript
// This fails to compile — not at runtime
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger, Database
  .build();
// TypeScript: Type '"ERROR[HEX008]: Missing adapters for Logger | Database. Call .provide() first."'
//             is not assignable to type 'Graph<...>'
```

**The compiler reviews the architecture. You review the logic.**

---

## How It Works

HexDI represents your application's dependency graph as a live TypeScript object. Every service declares what it provides and what it requires. The compiler validates that every declared requirement is satisfied before a container can be created.

Not a convention — a constraint.

```
Port → Adapter → Graph → Container
```

1. **Port** — A contract. The `what`, not the `how`.
2. **Adapter** — An implementation that declares its dependencies explicitly.
3. **Graph** — A compile-time-validated collection of adapters. If it builds, it's wired correctly.
4. **Container** — A runtime resolver that creates instances from the validated graph.

```typescript
// 1. Define a contract
const LoggerPort = port<Logger>()({ name: 'Logger' });

// 2. Declare an implementation with explicit dependencies
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: console.log })
});

// 3. Build a structurally validated graph
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

// 4. Resolve services at runtime
const container = createContainer({ graph, name: "App" });
const logger = container.tryResolve(LoggerPort); // Result<Logger, ContainerError>
```

---

## The 4 Core Packages

Everything you need in one install:

```bash
pnpm add hex-di
```

The `hex-di` umbrella includes:

```
@hex-di/core      Port token system — the contracts
@hex-di/graph     GraphBuilder — structural validation at compile time
@hex-di/runtime   Container and scopes — deterministic resolution
```

For testing (devDependency):

```bash
pnpm add -D @hex-di/testing
```

For React applications:

```bash
pnpm add @hex-di/react
```

---

## Structural Guarantees

### Conventions enforced by hope. Constraints enforced by the compiler.

Most architectural rules in software are conventions: agreed upon, documented, checked in code review. They can be forgotten, bypassed, or simply missed under deadline pressure — especially when AI is generating the code.

HexDI makes architectural rules into structural facts:

| Problem | HexDI makes it a compile error |
|---|---|
| Missing dependency | `"ERROR[HEX008]: Missing adapters for Logger. Call .provide() first."` |
| Duplicate provider | `"ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call."` |
| Circular dependency | `"ERROR[HEX002]: Circular dependency: A -> B -> A. Fix: ..."` |
| Resolving unknown port | TypeScript error at call site |
| Wrong lifetime scope | `ScopeRequiredError` at resolution |

### Architecture as a living object, not a diagram that drifts.

The dependency graph isn't in a wiki. It's in the code. At runtime, the graph is a queryable TypeScript object that reflects the actual wiring — not a stale Confluence page.

### Structurally correct by construction.

If the graph compiles, all dependencies are satisfied. If the container builds, all adapters are correctly composed. The guarantee isn't "someone reviewed it" — it's "the type system verified it."

---

## Getting Started

New to HexDI? Follow this path:

1. [Installation](./getting-started/installation.md) — One command. Done.
2. [Core Concepts](./getting-started/core-concepts.md) — Ports, adapters, graphs, containers
3. [First Application](./getting-started/first-application.md) — Build something complete
4. [Lifetimes](./getting-started/lifetimes.md) — Singleton, scoped, transient

---

## Guides

- [React Integration](./guides/react-integration.md) — Typed hooks, providers, scope management
- [Testing Strategies](./guides/testing-strategies.md) — Mock adapters, override patterns
- [Error Handling](./guides/error-handling.md) — Error hierarchy and recovery

## Patterns

- [Project Structure](./patterns/project-structure.md) — Organizing ports, adapters, graphs
- [Composing Graphs](./patterns/composing-graphs.md) — Branching, modules, composition
- [Scoped Services](./patterns/scoped-services.md) — Request contexts, user sessions
- [Finalizers & Cleanup](./patterns/finalizers-and-cleanup.md) — Resource disposal

## API Reference

- [@hex-di/core](./api/core.md) — Port token system
- [@hex-di/graph](./api/graph.md) — GraphBuilder and adapters
- [@hex-di/runtime](./api/runtime.md) — Container and scopes
- [@hex-di/result](./api/result.md) — Rust-style `Result<T, E>`
- [@hex-di/react](./api/react.md) — React integration
- [@hex-di/testing](./api/testing.md) — Testing utilities

---

## Package Architecture

```
                    ┌─────────────────┐
                    │   Your App      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │@hex-di/react │  │@hex-di/testing   │(your adapters)│
  │  (optional)  │  │  (dev only)  │  │              │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         └─────────────────┼─────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ @hex-di/runtime │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  @hex-di/graph  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  @hex-di/core   │
                  │  (zero deps)    │
                  └─────────────────┘
```

---

## The Ecosystem

HexDI is more than a DI container. Every library in the ecosystem exposes its functionality as **ports** — contracts wired through the same container. Your application becomes a self-describing system: the container knows what it provides, how it's connected, and what each part is doing at runtime.

| Library | Purpose |
|---|---|
| `@hex-di/logger` | Structured logging with swappable backends (pino, winston, bunyan) |
| `@hex-di/tracing` | Distributed tracing with W3C Trace Context (OTel, Datadog, Jaeger, Zipkin) |
| `@hex-di/query` | Port-based data fetching and caching |
| `@hex-di/store` | Signal-based reactive state as a DI port |
| `@hex-di/flow` | State machines as dependency-injected services |
| `@hex-di/saga` | Distributed workflow orchestration |
| `@hex-di/guard` | Role/permission/policy evaluation as a typed port |
| `@hex-di/clock` | Testable time — injectable clock port with virtual time support |
| `@hex-di/http-client` | Typed HTTP client port with interceptors and retry |

All libraries are designed to be composed together through the graph. See the [repository README](https://github.com/hex-di/hex-di) for the full package list.

## Getting Help

- [GitHub Issues](https://github.com/hex-di/hex-di/issues) — Bug reports and feature requests
- [Examples](./examples/README.md) — Working code examples
- [API Reference](./api/README.md) — Complete API documentation
