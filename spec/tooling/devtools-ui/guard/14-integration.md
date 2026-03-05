_Previous: [13-filter-and-search.md](13-filter-and-search.md) | Next: [15-accessibility.md](15-accessibility.md)_

# 14. Integration

How the Guard Panel registers with the DevTools infrastructure, connects to data sources, integrates with the Playground, and supports export.

## 14.1 Panel Registration

The Guard Panel registers itself with the DevTools panel system:

```typescript
interface PanelRegistration {
  readonly id: "guard";
  readonly label: "Guard";
  readonly icon: GuardPanelIcon; // Shield icon with checkmark
  readonly order: 4; // After Container (1), Graph (2), and Result (3)
  readonly component: typeof GuardPanel;
  readonly dataRequirements: readonly [
    "guardStatistics", // Level 0: per-port stats
    "guardDescriptors", // Level 1: policy tree descriptors
    "guardExecutions", // Level 1: evaluation execution traces
  ];
}
```

### Panel Lifecycle

| Phase          | Behavior                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Mount          | Subscribe to data source, load localStorage preferences, render default view |
| Data available | Populate port selector, render active view                                   |
| Data update    | Refresh affected views (debounced per [Section 11.10](11-interactions.md))   |
| Unmount        | Unsubscribe from data source, save preferences to localStorage               |

## 14.2 Data Source Interface

The Guard Panel consumes data through a `GuardDataSource` interface, matching the existing DevTools data source pattern:

```typescript
interface GuardDataSource {
  /** Get all policy tree descriptors. */
  getDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor>;

  /** Get per-port statistics (Level 0 -- always available). */
  getPortStatistics(): ReadonlyMap<string, GuardPortStatistics>;

  /** Get recent executions for a port (Level 1 -- requires tracing). */
  getExecutions(portName: string): readonly GuardEvaluationExecution[];

  /** Get computed paths for a descriptor. */
  getPaths(descriptorId: string): readonly GuardPathDescriptor[];

  /** Get the role hierarchy. */
  getRoleHierarchy(): readonly SerializedRole[];

  /** Get the complete panel snapshot. */
  getSnapshot(): GuardPanelSnapshot;

  /** Subscribe to data changes. */
  subscribe(listener: (event: GuardDataEvent) => void): () => void;
}
```

### Data Events

```typescript
type GuardDataEvent =
  | { readonly type: "descriptor-registered"; readonly descriptorId: string }
  | { readonly type: "execution-added"; readonly portName: string; readonly executionId: string }
  | { readonly type: "statistics-updated"; readonly portName: string }
  | { readonly type: "role-hierarchy-updated" }
  | { readonly type: "snapshot-changed" }
  | { readonly type: "connection-lost" }
  | { readonly type: "connection-restored" };
```

### Data Source Implementations

| Context            | Implementation          | Transport                        |
| ------------------ | ----------------------- | -------------------------------- |
| DevTools (remote)  | `RemoteGuardDataSource` | WebSocket to container inspector |
| Playground (local) | `LocalGuardDataSource`  | Direct in-memory access          |
| Tests              | `MockGuardDataSource`   | Programmatic fixture data        |

## 14.3 Inspector Integration

The Guard Panel data originates from the container inspector. The inspector is extended with Guard-specific methods:

### Level 0 (No Code Changes Required)

The existing `GuardInspector` from `@hex-di/guard` already provides:

- `activePolicies`: per-port policy kind
- `recentDecisions`: last N decisions with subject, port, outcome
- `permissionStats`: per-port allow/deny counts

The Overview Dashboard and basic Decision Log views use this data.

### Level 1 (Opt-In Tracing)

New inspector methods for deep evaluation tracing:

```typescript
interface GuardInspectorExtension {
  /** Get all registered policy tree descriptors. */
  getGuardDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor>;

  /** Get recent executions for a port. */
  getGuardExecutions(portName: string): readonly GuardEvaluationExecution[];

  /** Get computed paths for a descriptor. */
  getGuardPaths(descriptorId: string): readonly GuardPathDescriptor[];

  /** Get the role hierarchy from registered role tokens. */
  getRoleHierarchy(): readonly SerializedRole[];

  /** Subscribe to Guard data changes. */
  onGuardEvent(listener: (event: GuardDataEvent) => void): () => void;
}
```

### Inspector Data Flow

```
Container Runtime
  └── guard() adapter registration
       └── GuardInspector.registerPolicy(portName, policyKind)
            └── GuardInspector.onEvent(GuardAllowEvent | GuardDenyEvent | GuardErrorEvent)
                 └── GuardInspectorExtension (Level 1)
                      ├── Build GuardEvaluationDescriptor from PolicyConstraint tree
                      ├── Record GuardEvaluationExecution per evaluate() call
                      ├── Compute GuardPathDescriptor from descriptor + executions
                      └── Build SerializedRole from registered role tokens
```

## 14.4 Playground Integration

In the Playground context, the Guard Panel benefits from automatic tracing:

### Auto-Tracing

The Playground sandbox automatically wraps all `guard()` calls with tracing:

```typescript
// Playground sandbox patches (internal)
// All guard() adapters get their evaluator wrapped with tracing
const originalGuard = guard;
const wrappedGuard = (options: GuardOptions) =>
  originalGuard({
    ...options,
    __trace: true, // Internal flag enabling per-node tracing
  });
```

### Playground-Specific Features

| Feature                        | Description                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| Auto-select first guarded port | When playground runs, the panel selects the first guarded port |
| Instant evaluation display     | Evaluation results appear in real-time as code executes        |
| Subject preset injection       | Playground provides test subjects for simulation               |
| Policy hot-reload              | Changing policy code updates the tree view immediately         |
| Educational prompts active     | All learning prompts are enabled in playground context         |

### Playground Subject Panel

The playground sidebar provides a subject configuration panel:

```
┌── Playground Subject ──────────────────────┐
│ ID: [playground-user           ]           │
│ Roles: [admin] [editor] [+ Add]            │
│ Permissions: [user:read] [+ Add]           │
│ Attributes:                                │
│   department: [engineering     ]           │
│   clearanceLevel: [5           ]           │
│                                            │
│ [Run Evaluation >>]                        │
└────────────────────────────────────────────┘
```

Changes to the subject immediately re-evaluate all guarded ports and update the Guard Panel.

## 14.5 Export

### Export Formats

| Format             | Content                                     | File Extension |
| ------------------ | ------------------------------------------- | -------------- |
| JSON (full)        | Complete `GuardPanelSnapshot` with all data | `.json`        |
| JSON (filtered)    | Snapshot filtered by current filters        | `.json`        |
| CSV (decisions)    | Decision log entries as CSV                 | `.csv`         |
| JSON (audit trail) | Decision log entries in `AuditEntry` format | `.jsonl`       |
| SVG (tree)         | Policy evaluation tree as SVG               | `.svg`         |
| SVG (roles)        | Role hierarchy graph as SVG                 | `.svg`         |
| SVG (sankey)       | Access flow statistics diagram as SVG       | `.svg`         |

### Export UI

```
+--[Export v]-------------------------------------+
|  Export current view:                            |
|    Policy Tree as SVG                           |
|    Role Graph as SVG                            |
|    Sankey Diagram as SVG                        |
|  ──────────────────────────────────────────── |
|  Export data:                                    |
|    Full snapshot (JSON)                         |
|    Filtered snapshot (JSON)                     |
|    Decision log (CSV)                           |
|    Audit trail (JSONL)                          |
+--------------------------------------------------+
```

### CSV Decision Log Format

```csv
evaluationId,timestamp,portName,subjectId,decision,policyKind,durationMs,reason
eval-847,2024-01-15T14:32:01.423Z,UserService,alice,allow,allOf,0.15,
eval-846,2024-01-15T14:32:01.381Z,PaymentPort,bob,deny,hasRole,0.08,"subject lacks role 'payment-admin'"
```

### JSONL Audit Trail Format

Each line is a JSON `AuditEntry`:

```jsonl
{"evaluationId":"eval-847","timestamp":"2024-01-15T14:32:01.423Z","subjectId":"alice","decision":"allow","portName":"UserService","policy":"allOf","durationMs":0.15,"reason":"","authenticationMethod":"jwt","scopeId":"request-123","schemaVersion":1}
{"evaluationId":"eval-846","timestamp":"2024-01-15T14:32:01.381Z","subjectId":"bob","decision":"deny","portName":"PaymentPort","policy":"hasRole","durationMs":0.08,"reason":"subject lacks role 'payment-admin'","authenticationMethod":"jwt","scopeId":"request-124","schemaVersion":1}
```

## 14.6 Performance Budgets

### Rendering Budgets

| View                   | Initial Render         | Re-render (data update) |
| ---------------------- | ---------------------- | ----------------------- |
| Policy Evaluation Tree | < 100ms for 50 nodes   | < 50ms                  |
| Decision Log           | < 50ms for 100 entries | < 20ms (virtual scroll) |
| Policy Path Explorer   | < 150ms for 100 paths  | < 50ms                  |
| Access Flow Statistics | < 200ms for 50 nodes   | < 100ms                 |
| Evaluation Timeline    | < 50ms for 50 rows     | < 30ms                  |
| Role Hierarchy Graph   | < 100ms for 30 nodes   | < 50ms                  |
| Overview Dashboard     | < 50ms                 | < 30ms                  |

### Data Processing Budgets

| Operation                           | Budget                                 |
| ----------------------------------- | -------------------------------------- |
| Descriptor construction from policy | < 5ms for 100-node policy tree         |
| Path computation                    | < 100ms for 256 paths                  |
| Execution recording                 | < 1ms per evaluation (including trace) |
| Snapshot serialization              | < 50ms for full snapshot               |
| Filter application                  | < 20ms for 10,000 entries              |
| Role hierarchy flattening           | < 10ms for 50 roles                    |

### Memory Budgets

| Data Type             | Maximum Retention                        |
| --------------------- | ---------------------------------------- |
| Execution ring buffer | 100 per port (default), 200 max          |
| Subject snapshots     | 10KB per subject                         |
| Path descriptors      | 256 per descriptor                       |
| Role hierarchy        | Entire hierarchy (typically < 100 roles) |
| Decision log entries  | 10,000 entries in UI buffer              |

## 14.7 Error Handling

### Data Source Errors

| Error                   | Panel Behavior                                          |
| ----------------------- | ------------------------------------------------------- |
| Connection lost         | Show "Disconnected" badge; freeze last data; retry loop |
| Connection restored     | Show "Reconnecting..." then refresh all data            |
| Data parse error        | Log warning; skip malformed entries                     |
| Inspector not available | Show "Guard Inspector not found" empty state            |

### Rendering Errors

| Error              | Panel Behavior                                      |
| ------------------ | --------------------------------------------------- |
| Component crash    | ErrorBoundary catches; show "View error" with retry |
| SVG render failure | Fallback to text-based tree/list rendering          |
| Export failure     | Toast notification: "Export failed: [reason]"       |

## 14.8 DevTools Panel Communication

### Panel-to-Panel Messages

The Guard Panel communicates with other DevTools panels via a shared message bus:

```typescript
type GuardPanelMessage =
  | { readonly type: "guard:navigate"; readonly navigation: GuardPanelNavigation }
  | { readonly type: "guard:highlight-port"; readonly portName: string }
  | { readonly type: "guard:request-subject"; readonly subjectId: string };
```

### Incoming Messages

| Message Type              | From Panel | Effect                             |
| ------------------------- | ---------- | ---------------------------------- |
| `graph:port-selected`     | Graph      | Filter to that port                |
| `graph:guard-badge-click` | Graph      | Open Tree view for that port       |
| `result:guard-error`      | Result     | Open Log view filtered to error    |
| `container:scope-select`  | Container  | Filter to executions in that scope |

### Outgoing Messages

| Message Type            | To Panel  | Trigger                         |
| ----------------------- | --------- | ------------------------------- |
| `guard:navigate`        | Any       | Cross-panel navigation          |
| `guard:highlight-port`  | Graph     | Highlight guarded port in graph |
| `guard:request-subject` | Container | Request full subject data       |

_Previous: [13-filter-and-search.md](13-filter-and-search.md) | Next: [15-accessibility.md](15-accessibility.md)_
