# Glossary

Terminology in HexDI is defined per-package in the specification directory. This page provides a quick reference for the most important cross-cutting terms and links to every package glossary.

---

## Key Terms

**Port** — A typed token representing a service contract. Ports declare _what_ is needed without specifying _how_ it is provided. Defined in [@hex-di/core](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/glossary.md).

**Adapter** — A concrete implementation bound to a port. Adapters declare their provided port, required ports, lifetime, and factory function. Defined in [@hex-di/core](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/glossary.md).

**Graph** — A validated set of adapters wired together. The graph builder performs compile-time and runtime checks (cycle detection, missing dependencies, captive dependency analysis). Defined in [@hex-di/graph](https://github.com/leaderiop/hex-di/blob/main/spec/packages/graph/glossary.md).

**Container** — The runtime resolution engine created from a validated graph. Resolves ports to service instances respecting lifetime rules. Defined in [@hex-di/core](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/glossary.md).

**Lifetime** — The duration strategy for a resolved service: `singleton` (once per container), `scoped` (once per scope), or `transient` (every resolution). Defined in [@hex-di/core](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/glossary.md).

**Scope** — A child container with its own singleton-like cache for scoped services. Scopes share the parent's singletons but isolate scoped instances. Defined in [@hex-di/core](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/glossary.md).

**Result** — A discriminated union (`Ok<T>` | `Err<E>`) for representing success or failure without exceptions. Defined in [@hex-di/result](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/glossary.md).

---

## Package Glossaries

### Core Packages

| Package                    | Topics                                                                               | Glossary                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `@hex-di/core`             | Port, Adapter, Container, Scope, Lifetime, Blame Context, Phantom State              | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/glossary.md)           |
| `@hex-di/graph`            | GraphBuilder, Dependency Graph, Cycle Detection, Captive Dependency, Composition Law | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/packages/graph/glossary.md)          |
| `@hex-di/result`           | Result, Ok, Err, Option, Discriminated Union, Combinator, Do Notation                | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/glossary.md)         |
| `@hex-di/result` (React)   | React hooks, Suspense integration, Match components                                  | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/react/glossary.md)   |
| `@hex-di/result` (Testing) | Test fixtures, mock factories, assertion helpers                                     | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/testing/glossary.md) |

### Libraries

| Library               | Topics                                                                      | Glossary                                                                                    |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@hex-di/guard`       | Permission, Role, Policy, RBAC/ABAC/ReBAC, Audit Trail, GxP Compliance      | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard/glossary.md)       |
| `@hex-di/clock`       | Branded Timestamp, ClockPort, Monotonic Time, TemporalContext, VirtualClock | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/clock/glossary.md)       |
| `@hex-di/http-client` | HttpClient, Transport Adapter, Client Combinator, Retry, Audit Sink         | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/http-client/glossary.md) |
| `@hex-di/logger`      | LogLevel, Log Entry, LogContext, Child Logger, Redaction, Sampling          | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/logger/glossary.md)      |
| `@hex-di/query`       | Query cache, query client, query inspector                                  | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/query/glossary.md)       |
| `@hex-di/store`       | State service, reactivity system, store inspector                           | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/store/glossary.md)       |
| `@hex-di/flow`        | State machine, activities, effects, runner                                  | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/flow/glossary.md)        |
| `@hex-di/saga`        | Saga, compensation, saga executor, saga inspector                           | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/saga/glossary.md)        |
| `@hex-di/tracing`     | Span, tracer, trace context, exporters                                      | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/tracing/glossary.md)     |
| `@hex-di/crypto`      | Encryption, hashing, key management                                         | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/crypto/glossary.md)      |
| `@hex-di/guard-cedar` | Cedar policy language integration                                           | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard-cedar/glossary.md) |
| `@hex-di/guard-rego`  | Rego/OPA policy language integration                                        | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard-rego/glossary.md)  |

### Cross-cutting

| Spec      | Topics                                                    | Glossary                                                                             |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| SpecForge | Meta-specification framework, agent roles, spec lifecycle | [glossary](https://github.com/leaderiop/hex-di/blob/main/spec/specforge/glossary.md) |
