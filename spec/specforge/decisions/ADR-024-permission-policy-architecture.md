---
id: ADR-024
kind: decision
title: Permission Policy Architecture
status: Accepted
date: 2026-02-28
supersedes: []
invariants: [INV-SF-43]
---

# ADR-024: Permission Policy Architecture

**Extends:** [ADR-018](./ADR-018-acp-agent-protocol.md)

## Context

SpecForge agents perform sensitive operations — file writes, terminal command execution, code deployment, MCP tool invocations — that require permission management. The current approach embeds permission checks directly in the ACP layer:

1. **Coupled permission logic** — Permission decisions are scattered across `ACPServerService` handler implementations. Each handler applies ad-hoc rules (e.g., "block file writes to `/etc`"), with no centralized policy evaluation.
2. **No policy composition** — Simple rules (allow/deny per tool) cannot be composed into complex policies (e.g., "allow file writes to the project directory AND deny writes to `node_modules` UNLESS the agent role is `architect`").
3. **No audit trail** — Permission decisions are not recorded. When a tool invocation fails due to a permission check, neither the user nor the system administrator can determine which rule denied it or why.
4. **No `@hex-di/guard` alignment** — The `@hex-di/guard` library provides a full policy evaluation engine with 10 policy kinds, composition operators, and audit trails. SpecForge reimplements a subset of this functionality in an unstructured way.

## Decision

### 1. Dedicated `PermissionPolicyPort`

Introduce `PermissionPolicyPort` as a hexagonal port decoupled from the ACP layer. The port defines a single evaluation method:

```
evaluate(request: PermissionRequest) => ResultAsync<PermissionDecision, PermissionPolicyError>
```

- `PermissionRequest` describes the operation being requested: the agent role, tool name, resource path, operation type (`read`, `write`, `execute`, `delete`), and session metadata.
- `PermissionDecision` returns `allow` or `deny` with the matching rule ID and an explanation string.
- The port is injected into `ACPServerService` handlers and `McpProxyPort` routing logic. Permission evaluation occurs before tool dispatch — a denied request never reaches the tool backend.

This separation means permission policies can be swapped without modifying ACP handler code. The default adapter evaluates rules from a JSON configuration file; future adapters could query an external policy service.

### 2. Policy Rule Format

Permission policies are defined as an ordered list of `PermissionRule` entries evaluated top-to-bottom:

```
interface PermissionRule {
  readonly ruleId: string
  readonly priority: number
  readonly effect: "allow" | "deny"
  readonly conditions: PermissionConditions
  readonly description: string
}

interface PermissionConditions {
  readonly roles?: ReadonlyArray<string>
  readonly tools?: ReadonlyArray<string>
  readonly resourcePatterns?: ReadonlyArray<string>
  readonly operations?: ReadonlyArray<"read" | "write" | "execute" | "delete">
  readonly sessionTags?: ReadonlyArray<string>
}
```

Rules are sorted by `priority` (lower number = higher priority). The first matching rule determines the decision. If no rule matches, the default deny policy applies (see Decision 4).

Conditions use AND semantics within a rule: all specified condition fields must match. Unspecified fields are treated as wildcards. `resourcePatterns` supports glob syntax (e.g., `"src/**/*.ts"`, `"!node_modules/**"`).

### 3. Guard Integration Path

The `PermissionPolicyPort` is designed for future integration with `@hex-di/guard`:

- `PermissionRule` maps to `@hex-di/guard`'s `hasPermission` and `hasRole` policy kinds.
- `PermissionConditions.roles` maps to `hasRole` policies with role hierarchy support.
- `PermissionConditions.resourcePatterns` maps to `hasResourceAttribute` policies.
- Composite policies (rules with multiple conditions) map to `allOf` composition.

The default adapter implements a simplified evaluator that processes `PermissionRule` entries directly. When `@hex-di/guard` is available as a dependency, a `GuardPermissionAdapter` can replace it, gaining access to the full policy algebra (`anyOf`, `not`, `labeled`), async evaluation, batch evaluation, and the GxP audit trail.

The port interface remains the same regardless of which adapter is active. This follows the hexagonal architecture principle: the domain depends on the port, not the adapter.

### 4. Deny-by-Default with Evaluation Audit Trail

The permission system operates on a deny-by-default basis (INV-SF-43):

- If no rule matches a `PermissionRequest`, the evaluation returns `deny` with a synthetic rule ID `"default-deny"` and an explanation indicating no matching allow rule was found.
- Every evaluation — whether it results in `allow` or `deny` — produces a `PermissionAuditEntry` recorded via the event bus:

```
interface PermissionAuditEntry {
  readonly evaluationId: string
  readonly timestamp: string
  readonly request: PermissionRequest
  readonly decision: PermissionDecision
  readonly matchedRuleId: string | undefined
  readonly evaluatedRuleCount: number
  readonly evaluationDurationMs: number
}
```

- Audit entries are emitted as `OrchestratorEvent { _tag: "PermissionEvaluated" }` events, enabling the dashboard to display real-time permission activity.
- The audit trail is queryable by session ID, agent role, and time range through the `InspectorPort` for post-hoc analysis.
- In GxP mode, audit entries are additionally hashed into the GxP audit chain for tamper-evident compliance recording.

## Concept Mapping

| Pattern                             | SpecForge Adoption                                        |
| ----------------------------------- | --------------------------------------------------------- |
| AWS IAM policy evaluation           | Priority-ordered rules, deny-by-default, first-match wins |
| `@hex-di/guard` `hasPermission`     | `PermissionRule` with role and resource conditions        |
| `@hex-di/guard` `allOf` composition | AND semantics within `PermissionConditions`               |
| OWASP permission logging            | `PermissionAuditEntry` for every evaluation               |
| Kubernetes RBAC deny-by-default     | No matching rule → deny with `"default-deny"` rule ID     |

## Trade-Offs

**Benefits:**

- Dedicated port decouples permission logic from ACP handler implementations
- Ordered rule evaluation with priority provides predictable, debuggable policy behavior
- Deny-by-default ensures new tools and resources are secure until explicitly permitted
- Audit trail provides full visibility into permission decisions for debugging and compliance
- Guard integration path avoids reimplementing policy algebra while allowing standalone operation
- Glob patterns in `resourcePatterns` provide flexible path matching without regex complexity

**Costs:**

- Per-request evaluation adds latency to every tool dispatch (mitigated: rule evaluation is in-memory, typically sub-millisecond)
- Audit entry emission adds event bus traffic proportional to tool invocation frequency
- Policy configuration requires learning the rule format; misconfigured priorities can produce unexpected results
- Guard integration requires `@hex-di/guard` as an optional dependency, adding conditional dependency management

## Consequences

- [types/acp.md](../types/acp.md) — `PermissionRequest`, `PermissionDecision`, `PermissionRule`, `PermissionConditions`, `PermissionAuditEntry`
- [types/ports.md](../types/ports.md) — `PermissionPolicyPort` with `evaluate()` method
- [types/errors.md](../types/errors.md) — `PermissionPolicyError` with rule parsing and evaluation failure variants
- [invariants/INV-SF-43-permission-policy-determinism.md](../invariants/INV-SF-43-permission-policy-determinism.md) — No matching rule MUST result in deny
- [behaviors/BEH-SF-528-permission-policy.md](../behaviors/BEH-SF-528-permission-policy.md) — BEH-SF-528 through BEH-SF-535
- [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md) — PermissionPolicyPort injection into ACP handlers and MCP proxy

## References

- [ADR-018](./ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol (extended, not superseded)
- [ADR-023](./ADR-023-session-resilience-mcp-integration.md) — MCP Proxy Architecture (permission evaluation at proxy routing)
- [types/acp.md](../types/acp.md) — Full type definitions for permission types
- [`@hex-di/guard`](../../../libs/guard/core/) — Guard policy evaluation library
