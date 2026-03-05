_Previous: [01-overview.md](01-overview.md) | Next: [03-views-and-wireframes.md](03-views-and-wireframes.md)_

# 2. Instrumentation Layer

The Guard Panel operates at two levels of data fidelity:

- **Level 0 (zero-config)**: Per-port aggregate statistics from the existing `GuardInspector` in `@hex-di/guard`. Works without any code changes.
- **Level 1 (opt-in tracing)**: Per-node evaluation traces captured by an instrumented evaluator wrapper. Requires enabling deep tracing on the container.

## 2.1 Level 0: Existing GuardInspector Statistics

### Data Source

The runtime already tracks guard statistics via `GuardInspector`:

```typescript
// From @hex-di/guard (already exists)
interface GuardInspectionSnapshot {
  readonly activePolicies: Readonly<Record<string, string>>;
  readonly recentDecisions: ReadonlyArray<{
    readonly evaluationId: string;
    readonly portName: string;
    readonly decision: "allow" | "deny";
    readonly subjectId: string;
    readonly evaluatedAt: string;
  }>;
  readonly permissionStats: Readonly<
    Record<
      string,
      {
        readonly allow: number;
        readonly deny: number;
      }
    >
  >;
}
```

### Access Pattern

```typescript
// Via GuardInspector (already exists)
inspector.getSnapshot(): GuardInspectionSnapshot;
inspector.subscribe(listener: (event: GuardEvent) => void): () => void;
```

### Panel Capabilities at Level 0

| Feature                                   | Available                                  |
| ----------------------------------------- | ------------------------------------------ |
| Overview dashboard with allow/deny counts | Yes                                        |
| Per-port allow rate badges                | Yes                                        |
| Recent decision log (summary)             | Yes (last N decisions from snapshot)       |
| Active policy kind per port               | Yes                                        |
| Policy evaluation tree visualization      | No (no per-node trace data)                |
| Per-node evaluation detail                | No (no node-level data)                    |
| Policy path explorer                      | No (no path data)                          |
| Access flow statistics                    | Partial (port-level only, not per-subject) |
| Evaluation timeline                       | No (no timing data)                        |
| Role hierarchy graph                      | Partial (requires role registry access)    |

## 2.2 Level 1: Per-Node Evaluation Tracing

### 2.2.1 Tracing Evaluator Wrapper

A `tracedEvaluate` wrapper that intercepts the `evaluate()` function and records per-node `EvaluationNodeTrace` entries.

```typescript
// Public API in @hex-di/guard (new)
interface TracedEvaluateOptions {
  /** Maximum number of executions to retain (ring buffer). Default: 100. */
  readonly maxExecutions?: number;

  /** Whether to serialize resolved attribute values. Default: true.
   *  Set to false for performance-sensitive evaluations. */
  readonly captureResolvedValues?: boolean;

  /** Maximum depth for value serialization. Default: 3. */
  readonly serializationDepth?: number;

  /** Whether to capture subject snapshots per execution. Default: true. */
  readonly captureSubjects?: boolean;
}
```

### 2.2.2 TracedGuardEvaluator Interface

Wraps the standard `evaluate()` function to record per-node traces.

```typescript
interface TracedGuardEvaluator {
  /** Evaluate with tracing. Returns the standard Decision result. */
  evaluate(
    policy: PolicyConstraint,
    context: EvaluationContext,
    options?: EvaluateOptions
  ): Result<Decision, PolicyEvaluationError>;

  /** Access the descriptor built from the policy tree. */
  getDescriptor(portName: string): GuardEvaluationDescriptor | undefined;

  /** Access all descriptors. */
  getAllDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor>;

  /** Access execution traces collected for a port. */
  getExecutions(portName: string): readonly GuardEvaluationExecution[];

  /** Access computed paths for a descriptor. */
  getPaths(descriptorId: string): readonly GuardPathDescriptor[];
}
```

### 2.2.3 Descriptor Construction

The descriptor is built by walking the `PolicyConstraint` tree when a guard is first registered:

```
guard({ resolve: allOf(hasRole("admin"), anyOf(hasPermission(P), hasAttribute("dept", eq("eng")))) })

→ descriptor.rootNode:
    AllOf (depth=0)
    ├── HasRole "admin" (depth=1, nodeId="0.0")
    └── AnyOf (depth=1, nodeId="0.1")
        ├── HasPermission "resource:action" (depth=2, nodeId="0.1.0")
        └── HasAttribute "dept" eq("eng") (depth=2, nodeId="0.1.1")

→ descriptor.leafCount: 3
→ descriptor.maxDepth: 2
→ descriptor.policyKinds: Set { "allOf", "hasRole", "anyOf", "hasPermission", "hasAttribute" }
```

### 2.2.4 Execution Trace Recording

Each evaluation records a tree of `EvaluationNodeTrace` entries matching the descriptor structure:

```
Execution #1 (subject: alice, decision: allow)
  AllOf: allow (0.15ms)
  ├── HasRole "admin": allow (0.02ms) [evaluated: true]
  └── AnyOf: allow (0.12ms)
      ├── HasPermission "resource:action": allow (0.05ms) [evaluated: true]
      └── HasAttribute "dept" eq("eng"): skip (0ms) [evaluated: false, short-circuited]

Execution #2 (subject: bob, decision: deny)
  AllOf: deny (0.08ms)
  ├── HasRole "admin": deny (0.02ms) [evaluated: true, reason: "subject lacks role 'admin'"]
  └── AnyOf: skip (0ms) [evaluated: false, short-circuited by AllOf]
      ├── HasPermission ...: skip
      └── HasAttribute ...: skip
```

### 2.2.5 Value Serialization

Resolved attribute values and subject data are serialized into `SerializedValue` (see [Section 1.4.7](01-overview.md)) for inspection. The serializer:

1. Handles primitives directly (string, number, boolean, null, undefined)
2. Handles `Date` -> ISO string
3. Handles `Error` -> `{ name, message, stack }`
4. Handles arrays -> truncated at `serializationDepth` items
5. Handles objects -> truncated at `serializationDepth` keys
6. Handles circular references -> `"[Circular]"` placeholder
7. Handles functions -> `"[Function: name]"` placeholder
8. Handles `Map`/`Set` -> converted to array representations
9. Total serialized size capped at 10KB per value

## 2.3 Container Integration

### 2.3.1 Registering Traced Evaluations with the Inspector

Traced evaluations automatically register with the container's inspector:

```typescript
// When guard() is called inside an adapter:
const adapter = createAdapter({
  provides: UserPort,
  requires: [SubjectProviderPort, DbPort],
  factory: ({ SubjectProvider, Db }) => ({
    getUser: (id: string) => {
      // guard() internally calls evaluate()
      // When tracing is enabled, the traced evaluator captures the full tree
      return Db.findById(id);
    },
  }),
  lifetime: "scoped",
  guard: {
    resolve: allOf(hasRole("viewer"), hasPermission(UserPermissions.read)),
  },
});

// The traced evaluator:
// 1. Builds a GuardEvaluationDescriptor from the policy tree
// 2. On each evaluation, records a GuardEvaluationExecution
// 3. Publishes execution events to the inspector event bus
```

### 2.3.2 Inspector Data Source Extension

New methods on `InspectorDataSource` for the Guard panel:

```typescript
interface InspectorDataSource {
  // ... existing methods ...

  /** Get all registered policy tree descriptors. */
  getGuardDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor>;

  /** Get recent executions for a specific port. */
  getGuardExecutions(portName: string): readonly GuardEvaluationExecution[];

  /** Get computed paths for a descriptor. */
  getGuardPaths(descriptorId: string): readonly GuardPathDescriptor[];

  /** Get the full Guard panel snapshot. */
  getGuardPanelSnapshot(): GuardPanelSnapshot;

  /** Get the role hierarchy. */
  getGuardRoleHierarchy(): readonly SerializedRole[];

  /** Subscribe to Guard-related updates. */
  subscribe(
    event: "guardDescriptorRegistered" | "guardEvaluationExecuted" | "guardStatisticsUpdated",
    callback: () => void
  ): () => void;
}
```

## 2.4 Adapter-Level Automatic Tracing

For adapters with `guard` options, the runtime can optionally auto-enable deep tracing:

```typescript
const container = createContainer({
  graph,
  name: "MyApp",
  inspect: {
    guardTracing: true, // Enable auto-tracing
    guardTracingBuffer: 200, // Execution ring buffer size
    guardCaptureSubjects: true, // Capture subject snapshots
    guardCaptureValues: true, // Capture resolved attribute values
  },
});
```

When `guardTracing: true`:

- Every adapter with `guard` options gets its evaluator wrapped with tracing
- The wrapper intercepts `evaluate()` and records per-node traces
- Descriptors are built from the policy trees and registered with the inspector
- Zero overhead when disabled (no wrapping occurs)

## 2.5 Performance Considerations

| Concern                         | Mitigation                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Memory from retained executions | Ring buffer (default 100 executions), configurable `maxExecutions`                                |
| Subject serialization cost      | `captureSubjects: false` disables subject snapshots. Depth limit caps traversal.                  |
| Attribute value serialization   | `captureResolvedValues: false` disables value capture. Depth limit caps traversal.                |
| Trace overhead per evaluation   | Tracing adds ~2-5 microseconds per policy node. Negligible for typical policy trees (< 50 nodes). |
| Event bus pressure              | Traces are batched: published every 16ms (one animation frame), not per-evaluation.               |
| Large subject attribute maps    | 10KB cap per serialized value. Exceeding values are truncated with `truncated: true` flag.        |

## 2.6 Playground Integration

In the Playground context, all guard evaluations are automatically traced because:

1. The playground sandbox runs user code in a controlled environment
2. The sandbox intercepts `guard()` calls to use the traced evaluator
3. No user opt-in needed -- the playground is an educational environment

```typescript
// Playground sandbox patches (internal)
// Wraps evaluate() with tracing for all guard() calls
const originalEvaluate = guardEvaluator.evaluate;
guardEvaluator.evaluate = (policy, context, options) =>
  tracedEvaluate(policy, context, {
    ...options,
    captureResolvedValues: true,
    captureSubjects: true,
  });
```

This ensures every guard evaluation in the playground is fully instrumented for the Policy Evaluation Tree and Decision Log views.

_Previous: [01-overview.md](01-overview.md) | Next: [03-views-and-wireframes.md](03-views-and-wireframes.md)_
