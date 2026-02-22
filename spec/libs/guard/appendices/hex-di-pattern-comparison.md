# Appendix E: Comparison with Existing hex-di Patterns

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-E                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix D: Type Relationship Diagram](./type-relationship-diagram.md) | Next: [Appendix F: Error Code Reference](./error-code-reference.md)_

---

This table maps @hex-di/guard concepts to existing patterns in the hex-di ecosystem.

| Guard Concept                | Existing Pattern                         | Package                   |
| ---------------------------- | ---------------------------------------- | ------------------------- |
| `Permission` branded token   | `Port` branded token                     | `@hex-di/core`            |
| `createPermission()`         | `port<T>()()`                            | `@hex-di/core`            |
| `createPermissionGroup()`    | Port groups (manual)                     | `@hex-di/core`            |
| `Role` with inheritance      | No direct equivalent                     | --                        |
| Policy discriminated union   | Error code discriminated unions          | `@hex-di/core`            |
| `evaluate()` returns Result  | `tryResolve()` returns Result            | `@hex-di/runtime`         |
| `guard()` adapter wrapper    | `createAdapter()` with requires          | `@hex-di/core`            |
| `SubjectProviderPort`        | `LoggerPort`, `TracerPort`               | `@hex-di/logger`, tracing |
| Resolution hook enforcement  | `ResolutionHooks.beforeResolve`          | `@hex-di/runtime`         |
| `GuardEventSinkPort` / `GuardSpanSinkPort` | `LoggerPort` / `TracerPort` (outbound sink ports) | `@hex-di/guard` (ports), `@hex-di/logger` / `@hex-di/tracing` (adapters) |
| `MemoryPolicyEngine`         | `MemoryTracer`, `MemoryLogger`           | `@hex-di/tracing`, logger |
| `setupGuardMatchers()`       | `setupResultMatchers()`                  | `@hex-di/result-testing`  |
| `createGuardHooks()`         | `createTypedHooks()`                     | `@hex-di/react`           |
| `SubjectProvider` component  | `HexDiContainerProvider`                 | `@hex-di/react`           |
| `Can` / `Cannot` components  | No direct equivalent (new)               | --                        |
| `useCan()` hook              | `usePort()` hook                         | `@hex-di/react`           |
| `GuardInspector`             | `TracingInspector`, `LoggerInspector`    | `@hex-di/tracing`, logger |
| Error codes (ACL001-ACL030)  | LOG001-LOG008, TRC001-TRC005             | `@hex-di/logger`, tracing |

---

_Previous: [Appendix D: Type Relationship Diagram](./type-relationship-diagram.md) | Next: [Appendix F: Error Code Reference](./error-code-reference.md)_
