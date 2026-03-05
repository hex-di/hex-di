_Next: [02-instrumentation.md](02-instrumentation.md)_

# 1. Overview & Data Models

## 1.1 Motivation

Authorization is invisible by default. When `guard()` wraps an adapter, developers see only the final allow/deny outcome -- the rich tree of policy evaluations, the subject's roles and permissions, the timing of attribute resolution, and the reasoning behind each decision remain hidden. This makes authorization logic hard to debug, hard to audit, and hard to learn.

The Guard Panel makes authorization visible:

- **Why was access denied?** -- See the full evaluation tree with per-node allow/deny outcomes and the specific policy node that caused denial.
- **What policies protect this port?** -- Browse the static policy tree structure for every guarded port.
- **Who is accessing what?** -- Chronological decision log with subject identity, port, policy, and outcome.
- **Where are the hotspots?** -- Aggregate flow from subjects through roles to decisions, highlighting ports with high deny rates.
- **How do roles compose?** -- Interactive DAG showing role inheritance and permission flattening.

## 1.2 Goals

| Goal                        | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| **Debuggable denials**      | Every deny decision traces back to the exact policy node that denied access   |
| **Policy comprehension**    | Compound policies (AllOf/AnyOf/Not) rendered as navigable trees               |
| **Audit visibility**        | Decision log mirrors production audit trail with full context                 |
| **Access pattern analysis** | Aggregate statistics reveal which subjects, roles, and ports dominate traffic |
| **Role structure clarity**  | Role inheritance DAG with flattened permission sets at each node              |
| **Educational onboarding**  | Built-in explanations for RBAC, ABAC, ReBAC, and compound policy patterns     |
| **Zero-config entry**       | Overview dashboard works with existing GuardInspector stats (no code changes) |
| **Deep tracing opt-in**     | Per-evaluation tree tracing available when developers need full detail        |

## 1.3 Relationship to `@hex-di/guard`

The Guard Panel consumes types from the existing `@hex-di/guard` library:

| Existing Type             | Source Module          | Panel Usage                                    |
| ------------------------- | ---------------------- | ---------------------------------------------- |
| `Decision` (Allow / Deny) | `evaluator/decision`   | Decision badges, trace rendering               |
| `EvaluationTrace`         | `evaluator/decision`   | Policy tree node rendering, timing display     |
| `PolicyConstraint`        | `policy/types`         | Static policy tree structure                   |
| `PolicyKind`              | `policy/types`         | Node icons, educational content mapping        |
| `GuardEvent`              | `guard/events`         | Real-time decision stream                      |
| `GuardInspectionSnapshot` | `inspection/inspector` | Level 0 overview dashboard data                |
| `AuthSubject`             | `subject/auth-subject` | Subject display in decision log and simulation |
| `AuditEntry`              | `guard/types`          | Audit-oriented decision log entries            |
| `RoleConstraint`          | `tokens/role`          | Role hierarchy graph nodes                     |
| `PermissionConstraint`    | `tokens/permission`    | Permission badges in role graph                |

## 1.4 Core Data Models

### 1.4.1 GuardEvaluationDescriptor

Static description of the policy tree structure attached to a guarded port. Built from the `PolicyConstraint` registered via `guard()`.

```typescript
interface GuardEvaluationDescriptor {
  /** Unique identifier for this guarded port's policy tree. */
  readonly descriptorId: string;

  /** The port name this policy tree protects. */
  readonly portName: string;

  /** Human-readable label (from LabeledPolicy or port name). */
  readonly label: string;

  /** Root node of the static policy tree. */
  readonly rootNode: PolicyNodeDescriptor;

  /** Total number of leaf policies in the tree. */
  readonly leafCount: number;

  /** Total depth of the deepest branch. */
  readonly maxDepth: number;

  /** Policy kinds present in the tree (for filtering). */
  readonly policyKinds: ReadonlySet<PolicyKind>;

  /** Whether this tree contains async-capable policies (HasAttribute with resolver, HasRelationship). */
  readonly hasAsyncPolicies: boolean;

  /** Source location of the guard() call, if available. */
  readonly sourceLocation: string | undefined;
}
```

### 1.4.2 PolicyNodeDescriptor

A single node in the static policy tree. Mirrors the `PolicyConstraint` discriminated union but adds rendering metadata.

```typescript
interface PolicyNodeDescriptor {
  /** Stable identifier within this tree (depth-first index). */
  readonly nodeId: string;

  /** The policy kind discriminant. */
  readonly kind: PolicyKind;

  /** Human-readable label. */
  readonly label: string | undefined;

  /** Child nodes (for AllOf, AnyOf, Not). Empty for leaf policies. */
  readonly children: readonly PolicyNodeDescriptor[];

  /** Leaf-specific data (for HasPermission, HasRole, HasAttribute, etc.). */
  readonly leafData: PolicyLeafData | undefined;

  /** Depth in the tree (root = 0). */
  readonly depth: number;

  /** Field strategy for compound nodes. */
  readonly fieldStrategy: "intersection" | "union" | "first" | undefined;
}
```

### 1.4.3 PolicyLeafData

Data specific to leaf policy types, extracted for display.

```typescript
type PolicyLeafData =
  | { readonly type: "hasPermission"; readonly resource: string; readonly action: string }
  | { readonly type: "hasRole"; readonly roleName: string }
  | { readonly type: "hasAttribute"; readonly attribute: string; readonly matcher: string }
  | { readonly type: "hasResourceAttribute"; readonly attribute: string; readonly matcher: string }
  | { readonly type: "hasSignature"; readonly meaning: string }
  | { readonly type: "hasRelationship"; readonly relation: string };
```

### 1.4.4 GuardEvaluationExecution

Runtime execution of a policy tree. One instance per `evaluate()` call, capturing the per-node trace.

```typescript
interface GuardEvaluationExecution {
  /** Unique execution identifier (matches EvaluationTrace.evaluationId). */
  readonly executionId: string;

  /** The descriptor this execution belongs to. */
  readonly descriptorId: string;

  /** The port name being accessed. */
  readonly portName: string;

  /** Subject who triggered the evaluation. */
  readonly subject: SerializedSubject;

  /** Final decision outcome. */
  readonly decision: "allow" | "deny";

  /** Per-node execution traces, matching the descriptor tree structure. */
  readonly rootTrace: EvaluationNodeTrace;

  /** Total evaluation duration in milliseconds. */
  readonly durationMs: number;

  /** ISO 8601 timestamp of evaluation. */
  readonly evaluatedAt: string;

  /** Reason string for deny decisions. */
  readonly reason: string | undefined;

  /** Visible fields after evaluation (if field masking is active). */
  readonly visibleFields: readonly string[] | undefined;
}
```

### 1.4.5 EvaluationNodeTrace

Per-node runtime trace within a policy tree execution. Maps 1:1 to `PolicyNodeDescriptor` nodes.

```typescript
interface EvaluationNodeTrace {
  /** Matches PolicyNodeDescriptor.nodeId. */
  readonly nodeId: string;

  /** The policy kind of this node. */
  readonly kind: PolicyKind;

  /** Result of this node's evaluation. */
  readonly result: "allow" | "deny";

  /** Whether this node was actually evaluated (false = short-circuited). */
  readonly evaluated: boolean;

  /** Duration of this node's evaluation in milliseconds. */
  readonly durationMs: number;

  /** Child traces for compound nodes. */
  readonly children: readonly EvaluationNodeTrace[];

  /** Human-readable reason (for deny outcomes). */
  readonly reason: string | undefined;

  /** Resolved attribute value (for HasAttribute policies). */
  readonly resolvedValue: SerializedValue | undefined;

  /** Whether an async resolution was required. */
  readonly asyncResolution: boolean;

  /** Visible fields contributed by this node. */
  readonly visibleFields: readonly string[] | undefined;
}
```

### 1.4.6 SerializedSubject

Serialized representation of an `AuthSubject` for display in the panel.

```typescript
interface SerializedSubject {
  /** Subject identifier. */
  readonly id: string;

  /** Role names. */
  readonly roles: readonly string[];

  /** Permission strings ("resource:action"). */
  readonly permissions: readonly string[];

  /** Serialized attributes (depth-limited). */
  readonly attributes: Readonly<Record<string, SerializedValue>>;

  /** Authentication method. */
  readonly authenticationMethod: string;

  /** ISO 8601 timestamp. */
  readonly authenticatedAt: string;

  /** Identity provider, if available. */
  readonly identityProvider: string | undefined;
}
```

### 1.4.7 SerializedValue

Depth-limited serialization of arbitrary values for safe display.

```typescript
type SerializedValue =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "null" }
  | { readonly type: "undefined" }
  | {
      readonly type: "object";
      readonly entries: ReadonlyMap<string, SerializedValue>;
      readonly truncated: boolean;
    }
  | {
      readonly type: "array";
      readonly items: readonly SerializedValue[];
      readonly truncated: boolean;
    }
  | { readonly type: "function"; readonly name: string }
  | { readonly type: "circular" }
  | {
      readonly type: "set";
      readonly items: readonly SerializedValue[];
      readonly truncated: boolean;
    }
  | {
      readonly type: "map";
      readonly entries: ReadonlyMap<string, SerializedValue>;
      readonly truncated: boolean;
    };
```

### 1.4.8 GuardPortStatistics

Aggregate statistics per guarded port, derived from `GuardInspectionSnapshot.permissionStats`.

```typescript
interface GuardPortStatistics {
  /** The port name. */
  readonly portName: string;

  /** Total evaluation count. */
  readonly totalEvaluations: number;

  /** Allow count. */
  readonly allowCount: number;

  /** Deny count. */
  readonly denyCount: number;

  /** Error count (evaluation failures). */
  readonly errorCount: number;

  /** Allow rate (0.0 to 1.0). */
  readonly allowRate: number;

  /** Most common deny reason. */
  readonly topDenyReason: string | undefined;

  /** Unique subjects that accessed this port. */
  readonly uniqueSubjects: number;

  /** Policy kind registered for this port. */
  readonly policyKind: string;
}
```

### 1.4.9 GuardPanelSnapshot

Complete snapshot of all Guard data for the panel.

```typescript
interface GuardPanelSnapshot {
  /** All registered policy tree descriptors. */
  readonly descriptors: ReadonlyMap<string, GuardEvaluationDescriptor>;

  /** Per-port aggregate statistics. */
  readonly portStats: ReadonlyMap<string, GuardPortStatistics>;

  /** Recent evaluation executions (ring buffer, newest first). */
  readonly recentExecutions: readonly GuardEvaluationExecution[];

  /** All discovered evaluation paths across all descriptors. */
  readonly paths: ReadonlyMap<string, readonly GuardPathDescriptor[]>;

  /** Role hierarchy for role graph view. */
  readonly roleHierarchy: readonly SerializedRole[];

  /** Total number of evaluations observed. */
  readonly totalEvaluationsObserved: number;

  /** Global allow rate across all ports. */
  readonly globalAllowRate: number;

  /** Timestamp of this snapshot. */
  readonly snapshotTimestamp: number;
}
```

### 1.4.10 GuardPathDescriptor

A single evaluation path through a compound policy tree.

```typescript
interface GuardPathDescriptor {
  /** Unique path identifier. */
  readonly pathId: string;

  /** Descriptor this path belongs to. */
  readonly descriptorId: string;

  /** Ordered list of node IDs visited in this path. */
  readonly nodeIds: readonly string[];

  /** Per-node outcome in this path. */
  readonly nodeOutcomes: readonly ("allow" | "deny" | "skip")[];

  /** Final outcome of this path. */
  readonly finalOutcome: "allow" | "deny";

  /** Human-readable description of this path. */
  readonly description: string;

  /** Runtime frequency (0.0 to 1.0). undefined if no executions observed. */
  readonly frequency: number | undefined;

  /** Number of observed executions taking this path. */
  readonly observedCount: number;
}
```

### 1.4.11 SerializedRole

Serialized role for the role hierarchy graph.

```typescript
interface SerializedRole {
  /** Role name. */
  readonly name: string;

  /** Direct permissions (not inherited). */
  readonly directPermissions: readonly string[];

  /** Inherited role names. */
  readonly inherits: readonly string[];

  /** All permissions including inherited (flattened). */
  readonly flattenedPermissions: readonly string[];

  /** Whether this role has circular inheritance (error state). */
  readonly hasCircularInheritance: boolean;
}
```

### 1.4.12 GuardFilterState

State of all active filters across the panel.

```typescript
interface GuardFilterState {
  /** Port name substring search. */
  readonly portSearch: string;

  /** Filter to a specific subject ID. undefined = all subjects. */
  readonly subjectId: string | undefined;

  /** Filter to a specific role. undefined = all roles. */
  readonly roleName: string | undefined;

  /** Filter by decision outcome. */
  readonly decision: "all" | "allow" | "deny" | "error";

  /** Filter to a specific policy kind. undefined = all kinds. */
  readonly policyKind: PolicyKind | undefined;

  /** Temporal window for aggregate data. */
  readonly timeRange: "5m" | "1h" | "24h" | "all" | { readonly from: number; readonly to: number };
}
```

### 1.4.13 GuardPanelNavigation

Context passed when navigating to/from the Guard Panel.

```typescript
interface GuardPanelNavigation {
  /** Descriptor to select on arrival. */
  readonly descriptorId: string | undefined;

  /** Execution to select on arrival. */
  readonly executionId: string | undefined;

  /** Node to highlight on arrival. */
  readonly nodeId: string | undefined;

  /** View to activate on arrival. */
  readonly view: GuardViewId | undefined;

  /** Subject to filter to on arrival. */
  readonly subjectId: string | undefined;

  /** Time range to set on arrival. */
  readonly timeRange: GuardFilterState["timeRange"] | undefined;
}

type GuardViewId = "tree" | "log" | "paths" | "sankey" | "timeline" | "roles" | "overview";
```

### 1.4.14 PolicyKind Reference

The 10-variant discriminated union from `@hex-di/guard`:

| Kind                   | Category   | Leaf / Compound | Description                              |
| ---------------------- | ---------- | --------------- | ---------------------------------------- |
| `hasPermission`        | RBAC       | Leaf            | Checks subject has a specific permission |
| `hasRole`              | RBAC       | Leaf            | Checks subject has a specific role       |
| `hasAttribute`         | ABAC       | Leaf            | Matches subject attribute via matcher    |
| `hasResourceAttribute` | ABAC       | Leaf            | Matches resource attribute via matcher   |
| `hasSignature`         | Compliance | Leaf            | Verifies electronic signature            |
| `hasRelationship`      | ReBAC      | Leaf            | Graph-traversal relationship check       |
| `allOf`                | Compound   | Compound        | All child policies must allow (AND)      |
| `anyOf`                | Compound   | Compound        | Any child policy must allow (OR)         |
| `not`                  | Compound   | Compound        | Negates child policy                     |
| `labeled`              | Wrapper    | Compound        | Wraps policy with human-readable label   |

## 1.5 Views Summary

The Guard Panel provides 7 coordinated views:

| #   | View                       | Purpose                                                  | Primary Data                                             |
| --- | -------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| 1   | **Policy Evaluation Tree** | Interactive tree visualization of policy evaluation      | `GuardEvaluationDescriptor` + `GuardEvaluationExecution` |
| 2   | **Decision Log**           | Chronological allow/deny/error log with full context     | `GuardEvaluationExecution`                               |
| 3   | **Policy Path Explorer**   | All possible paths with runtime frequency overlay        | `GuardPathDescriptor[]`                                  |
| 4   | **Access Flow Statistics** | Sankey diagram: subjects -> roles -> policies -> outcome | `GuardPortStatistics` + path frequencies                 |
| 5   | **Evaluation Timeline**    | Temporal execution with async resolver timing            | `GuardEvaluationExecution` (async evaluations)           |
| 6   | **Role Hierarchy Graph**   | DAG of role inheritance with permission flattening       | `SerializedRole[]`                                       |
| 7   | **Overview Dashboard**     | Summary stats, allow rates, deny distribution            | `GuardPanelSnapshot`                                     |

_Next: [02-instrumentation.md](02-instrumentation.md)_
