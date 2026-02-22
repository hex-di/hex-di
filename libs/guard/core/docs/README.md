# @hex-di/guard Documentation

Compile-time-safe authorization for the HexDI ecosystem. This documentation covers the full guard system -- from permission tokens through policy evaluation to DI enforcement and GxP audit infrastructure.

## Table of Contents

| Document                                | Description                                                               |
| --------------------------------------- | ------------------------------------------------------------------------- |
| [Architecture](./architecture.md)       | Module map, layer dependencies, hexagonal design                          |
| [Permissions](./permissions.md)         | Branded permission tokens, `Symbol.for()` identity, permission groups     |
| [Roles & Inheritance](./roles.md)       | Role DAG, permission flattening, cycle detection                          |
| [Policies & Composition](./policies.md) | Combinators, policy trees, short-circuit evaluation, field visibility     |
| [Evaluation](./evaluation.md)           | `evaluate()`, `evaluateAsync()`, `Decision`, `EvaluationTrace`            |
| [Guard Adapter & DI](./enforcement.md)  | `enforcePolicy()`, enforcement flow, error handling, health checks        |
| [Port Gate Hooks](./hooks.md)           | `createPortGateHook()`, `createRoleGate()`, infrastructure-level gating   |
| [Serialization](./serialization.md)     | `serializePolicy()`, `deserializePolicy()`, `explainPolicy()`             |
| [AuthSubject](./subject.md)             | `AuthSubject` interface, `SubjectProviderPort`, factory helpers           |
| [GxP Infrastructure](./gxp.md)          | Audit trail, WAL, circuit breaker, meta-audit, retention, decommissioning |

## Quick Navigation

**Getting started?** Read [Permissions](./permissions.md) -> [Roles](./roles.md) -> [Policies](./policies.md) -> [Evaluation](./evaluation.md).

**Integrating with HexDI?** Read [Enforcement](./enforcement.md) -> [Hooks](./hooks.md) -> [AuthSubject](./subject.md).

**Regulated environment?** Read [GxP Infrastructure](./gxp.md) after the core concepts.

**Want the big picture?** Start with [Architecture](./architecture.md).
