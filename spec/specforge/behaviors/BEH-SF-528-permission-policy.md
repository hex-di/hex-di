---
id: BEH-SF-528
kind: behavior
title: Permission Policy
status: active
id_range: 528--535
invariants: [INV-SF-43]
adrs: [ADR-024]
types: [acp, errors, ports]
ports: [PermissionPolicyService]
---

# 42 — Permission Policy

**ADR:** [ADR-024](../decisions/ADR-024-permission-policy-architecture.md)

**Architecture:** [c3-acp-layer.md](../architecture/c3-acp-layer.md)

---

## BEH-SF-528: Permission Policy Registration — Load Policies from Config

`PermissionPolicyService` loads permission policies from configuration at startup. Policies define what actions agents and tools are allowed or denied.

### Contract

REQUIREMENT (BEH-SF-528): When `PermissionPolicyService.loadPolicies(config)` is called, the system MUST parse the policy configuration and register all valid policies. Each policy MUST include `id`, `effect` (`allow` or `deny`), `subjects` (agent or tool patterns), `actions` (action patterns), `resources` (resource patterns), and `priority` (integer). If any policy fails validation, the system MUST return `PolicyValidationError` with details and MUST NOT load any policies from the batch (atomic loading). Successfully loaded policies MUST be queryable via `PermissionPolicyService.listPolicies()`.

### Verification

- Unit test: load 3 valid policies; verify all 3 are registered and returned by `listPolicies()`.
- Unit test: load a batch with 1 invalid policy (missing `effect`); verify `PolicyValidationError` and no policies are loaded.
- Unit test: verify each loaded policy has all required fields (`id`, `effect`, `subjects`, `actions`, `resources`, `priority`).

---

## BEH-SF-529: Policy Evaluation — Evaluate Against Loaded Policy Set

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-permission-policy-determinism.md) — Deny-by-Default Policy Evaluation

`PermissionPolicyService.evaluate(request)` evaluates a permission request against the loaded policy set and returns an `allow` or `deny` decision.

### Contract

REQUIREMENT (BEH-SF-529): When `PermissionPolicyService.evaluate(request)` is called with a `PermissionRequest` containing `subject`, `action`, and `resource`, the system MUST match the request against all loaded policies whose `subjects`, `actions`, and `resources` patterns match. The system MUST apply the deny-by-default principle: if no matching policy exists, the decision MUST be `deny`. If matching policies exist, the highest-priority policy's `effect` MUST determine the decision. The system MUST return a `PermissionDecision` with `effect`, `matchedPolicyId`, and `evaluationTimeMs`.

### Verification

- Unit test: request matches an `allow` policy; verify decision is `allow` with correct `matchedPolicyId`.
- Unit test: request matches no policy; verify decision is `deny` (deny-by-default).
- Unit test: request matches both `allow` and `deny` policies; verify highest-priority policy wins.

---

## BEH-SF-530: Policy Priority Resolution — Higher Priority Overrides Lower

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-permission-policy-determinism.md) — Deny-by-Default Policy Evaluation

When multiple policies match a permission request, the policy with the highest priority value takes precedence. Equal-priority conflicts are resolved by preferring `deny`.

### Contract

REQUIREMENT (BEH-SF-530): When multiple policies match a `PermissionRequest`, the system MUST select the policy with the highest `priority` value as the effective policy. If two or more matching policies share the same highest priority, the system MUST prefer the `deny` effect (deny wins on tie). The `PermissionDecision` MUST include all matched policy IDs in `matchedPolicies` for audit purposes, and the `effectivePolicyId` MUST identify the winning policy.

### Verification

- Unit test: `allow` at priority 10, `deny` at priority 20; verify `deny` wins (higher priority).
- Unit test: `allow` at priority 10, `deny` at priority 10 (tie); verify `deny` wins (deny-on-tie).
- Unit test: 3 matching policies at priorities 5, 10, 15; verify policy at priority 15 is effective.

---

## BEH-SF-531: Guard Integration Path — Accept Guard-Compatible Policy Format

`PermissionPolicyService` accepts policies in a format compatible with `@hex-di/guard`, enabling organizations to reuse existing Guard policy definitions for agent permission control.

### Contract

REQUIREMENT (BEH-SF-531): When `PermissionPolicyService.loadPolicies(config)` receives policies with `format: "guard"`, the system MUST translate Guard policy structures (`hasPermission`, `hasRole`, `allOf`, `anyOf`, `not`) into the internal policy representation. The translated policies MUST preserve the original Guard semantics: `allOf` requires all sub-policies to match, `anyOf` requires at least one, `not` inverts the match. The system MUST support a `guardAdapter` option for custom Guard-to-policy translation logic.

### Verification

- Unit test: load Guard `hasRole("admin")` policy; verify it translates to a valid internal policy matching the `admin` subject pattern.
- Unit test: load Guard `allOf(hasPermission("read"), hasPermission("write"))`; verify both permissions are required for a match.
- Unit test: load Guard `not(hasRole("guest"))`; verify the policy denies guests and allows non-guests.

---

## BEH-SF-532: Policy Hot Reload — Changes Applied Without Restart

Policy configuration changes can be applied at runtime without restarting the service. The system watches for configuration changes and reloads policies atomically.

### Contract

REQUIREMENT (BEH-SF-532): When `PermissionPolicyService.reloadPolicies()` is called, the system MUST atomically replace the current policy set with the newly loaded policies. During the reload, in-flight evaluations MUST complete against the old policy set; new evaluations MUST use the new policy set (no partial state). If the new configuration fails validation, the system MUST retain the old policy set and return `PolicyReloadError`. The system MUST emit a `PolicyReloadEvent` with `previousPolicyCount`, `newPolicyCount`, and `reloadTimestamp`.

### Verification

- Unit test: reload with valid new config; verify new policies are active and old policies are replaced.
- Unit test: reload with invalid new config; verify old policies remain active and `PolicyReloadError` is returned.
- Unit test: in-flight evaluation during reload; verify it completes against the old policy set.

---

## BEH-SF-533: Evaluation Audit Trail — Recorded as PermissionDecision Graph Nodes

Every permission evaluation is recorded as a `PermissionDecision` node in the session graph, enabling post-hoc audit and compliance review.

### Contract

REQUIREMENT (BEH-SF-533): When `PermissionPolicyService.evaluate(request)` completes, the system MUST record a `PermissionDecision` node in the session graph with: `requestSubject`, `requestAction`, `requestResource`, `decision` (`allow` or `deny`), `matchedPolicies` (array of policy IDs), `effectivePolicyId`, `evaluationTimeMs`, and `timestamp`. The `PermissionDecision` node MUST be linked to the current session node via an `EVALUATED_PERMISSION` edge. Audit records MUST be immutable once created.

### Verification

- Unit test: evaluate a permission; verify `PermissionDecision` node is created in the graph with all required fields.
- Unit test: verify `EVALUATED_PERMISSION` edge links the decision to the session node.
- Unit test: attempt to modify an existing `PermissionDecision` node; verify the modification is rejected (immutability).

---

## BEH-SF-534: Deny-by-Default — Absent Policies Result in Denial

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-permission-policy-determinism.md) — Deny-by-Default Policy Evaluation

When no policies are loaded or no policies match a permission request, the system denies the request. This ensures a secure default posture where permissions must be explicitly granted.

### Contract

REQUIREMENT (BEH-SF-534): When `PermissionPolicyService.evaluate(request)` is called and no policies are loaded, the system MUST return a `PermissionDecision` with `effect: "deny"` and `reason: "no_policies_loaded"`. When policies are loaded but none match the request, the system MUST return a `PermissionDecision` with `effect: "deny"` and `reason: "no_matching_policy"`. The deny-by-default behavior MUST NOT be configurable or overridable; it is a security invariant.

### Verification

- Unit test: no policies loaded; evaluate any request; verify `deny` with `reason: "no_policies_loaded"`.
- Unit test: policies loaded but none match the request; verify `deny` with `reason: "no_matching_policy"`.
- Unit test: verify deny-by-default cannot be bypassed by configuration (no `allowByDefault` option exists).

---

## BEH-SF-535: Decoupled from ACP — Evaluation Independent of Protocol Layer

`PermissionPolicyService` evaluates permissions purely based on subject/action/resource triples and does not depend on the ACP protocol layer. This enables reuse in non-ACP contexts.

### Contract

REQUIREMENT (BEH-SF-535): `PermissionPolicyService` MUST operate independently of the ACP protocol layer. The `evaluate(request)` method MUST accept a `PermissionRequest` containing only `subject`, `action`, and `resource` strings without any ACP-specific types. The service MUST NOT import or depend on any ACP types (`ACPMessage`, `FlowUpdate`, etc.). Integration with ACP MUST be handled by a separate adapter layer that translates ACP events into `PermissionRequest` objects.

### Verification

- Unit test: evaluate a permission request without any ACP context; verify the evaluation succeeds.
- Unit test: verify `PermissionPolicyService` module has no imports from ACP modules (static analysis).
- Unit test: verify the ACP integration adapter translates `ACPMessage` into `PermissionRequest` correctly.

---
