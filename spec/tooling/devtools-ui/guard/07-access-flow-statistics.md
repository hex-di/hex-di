_Previous: [06-policy-path-explorer.md](06-policy-path-explorer.md) | Next: [08-evaluation-timeline.md](08-evaluation-timeline.md)_

# 7. Access Flow Statistics View

The Access Flow Statistics view renders a Sankey-style flow diagram showing how authorization requests flow from subjects through roles and policies to final allow/deny outcomes. It reveals access patterns, hotspots, and bottlenecks at an aggregate level.

## 7.1 Core Metaphor

Authorization is a flow from identity to outcome:

```
Subjects  -->  Roles  -->  Policies  -->  Ports  -->  Decisions
```

The Sankey diagram renders this flow with proportional link widths, making it immediately visible where traffic concentrates and where denials cluster.

## 7.2 Wireframe

```
+--[Port Filter: All v]--[Time Range: Last 1h v]--[Min Flow: 1% v]---------+
|                                                                            |
|  Subjects       Roles          Policies        Ports          Outcome      |
|                                                                            |
|  ┌───────┐    ┌───────┐      ┌─────────┐    ┌───────────┐   ┌───────┐    |
|  │       │════│       │══════│         │════│           │═══│       │    |
|  │ alice │    │ admin │      │ allOf   │    │UserService│   │ Allow │    |
|  │  45%  │    │  52%  │      │  68%    │    │   48%     │   │  95%  │    |
|  │       │════│       │══════│         │════│           │═══│       │    |
|  └───────┘    └───────┘      └─────────┘    └───────────┘   └───────┘    |
|  ┌───────┐    ┌───────┐      ┌─────────┐    ┌───────────┐   ┌───────┐    |
|  │       │════│       │══════│         │════│           │═══│       │    |
|  │  bob  │    │viewer │      │ hasRole │    │PaymentPort│   │ Deny  │    |
|  │  30%  │    │  35%  │      │  25%    │    │   30%     │   │   5%  │    |
|  │       │    │       │      │         │    │           │   │       │    |
|  └───────┘    └───────┘      └─────────┘    └───────────┘   └───────┘    |
|  ┌───────┐    ┌───────┐      ┌─────────┐    ┌───────────┐                 |
|  │       │════│       │══════│         │════│           │                  |
|  │  eve  │    │editor │      │ anyOf   │    │ AdminPort │                  |
|  │  25%  │    │  13%  │      │   7%    │    │   22%     │                  |
|  │       │    │       │      │         │    │           │                  |
|  └───────┘    └───────┘      └─────────┘    └───────────┘                 |
|                                                                            |
+--[Hotspot Panel]-----------------------------------------------------------+
|                                                                            |
|  Deny Hotspots (ports with highest deny rates):                            |
|  ┌────────────────────────────────────────────────────────────────────┐    |
|  │ 1. PaymentPort — hasRole "payment-admin" — 28% deny  //////////  │    |
|  │ 2. AdminPort — allOf(hasRole, hasPerm) — 15% deny    ///////     │    |
|  │ 3. UserService — allOf(hasRole, anyOf) — 3% deny     //          │    |
|  └────────────────────────────────────────────────────────────────────┘    |
|                                                                            |
+----------------------------------------------------------------------------+
```

## 7.3 Sankey Columns

The diagram is organized into 5 columns:

| Column   | Nodes              | Data Source                               |
| -------- | ------------------ | ----------------------------------------- |
| Subjects | Unique subject IDs | `GuardEvaluationExecution.subject.id`     |
| Roles    | Unique role names  | `GuardEvaluationExecution.subject.roles`  |
| Policies | Root policy kinds  | `GuardEvaluationDescriptor.rootNode.kind` |
| Ports    | Guarded port names | `GuardEvaluationDescriptor.portName`      |
| Outcome  | Allow / Deny       | `GuardEvaluationExecution.decision`       |

### Column Node Sizing

- Node height is proportional to flow volume (percentage of total evaluations)
- Minimum node height: 24px (to ensure readability)
- Maximum nodes per column: 20 (remaining grouped as "Other (N)")

## 7.4 Sankey Links

### Link Properties

| Property | Value                                                        |
| -------- | ------------------------------------------------------------ |
| Width    | Proportional to flow volume                                  |
| Color    | Green gradient for allow flows, red gradient for deny flows  |
| Opacity  | 40% default, 80% on hover                                    |
| Curve    | Bezier curve connecting source to target vertically centered |
| Tooltip  | "alice -> admin: 312 evaluations (36%)"                      |

### Flow Calculation

Flows are computed from execution data:

1. **Subject -> Role**: Subject `alice` with roles `["admin", "editor"]` generates links to both `admin` and `editor` nodes (weighted by evaluation count).
2. **Role -> Policy**: The role is matched to the policy kind protecting the accessed port.
3. **Policy -> Port**: Direct mapping from policy to port.
4. **Port -> Outcome**: Final decision splits flow into allow/deny.

## 7.5 Toolbar Controls

### Port Filter

```
+--[Port Filter: All v]-----------+
|  All                             |
|  UserService only               |
|  PaymentPort only               |
|  AdminPort only                 |
+----------------------------------+
```

Selecting a specific port highlights its flows and dims others.

### Time Range

```
+--[Time Range: Last 1h v]--------+
|  Last 5 minutes                  |
|  Last 1 hour                     |
|  Last 24 hours                   |
|  All time                        |
|  Custom range...                 |
+----------------------------------+
```

### Minimum Flow Threshold

```
+--[Min Flow: 1% v]---------------+
|  0.1% (show all)                 |
|  1% (default)                    |
|  5%                              |
|  10%                             |
+----------------------------------+
```

Filters out low-volume flows for clarity.

## 7.6 Hotspot Detection

Hotspots are ports with disproportionately high deny rates. The algorithm:

1. For each port, compute `denyRate = denyCount / totalEvaluations`
2. Compute the global average deny rate
3. A port is a hotspot if `denyRate > 2 * globalAverage` or `denyRate > 10%`
4. Rank hotspots by deny count (highest first)

### Hotspot Display

```
1. PaymentPort — hasRole "payment-admin" — 28% deny rate
   ████████████████████████████░░░░░░░░░░░░░░░░░░░░  (28%)
   203 denials in last hour. Top deny reason: "missing role 'payment-admin'"
```

Each hotspot shows:

- Port name and root policy
- Deny rate bar (proportional, red fill)
- Absolute deny count in time window
- Top deny reason

## 7.7 Node Interactions

| Interaction        | Effect                                             |
| ------------------ | -------------------------------------------------- |
| Click subject node | Filter all flows to that subject                   |
| Click role node    | Filter all flows through that role                 |
| Click policy node  | Navigate to Policy Evaluation Tree for that policy |
| Click port node    | Navigate to Decision Log filtered to that port     |
| Click outcome node | Filter to allow-only or deny-only flows            |
| Hover any node     | Highlight all connected flows, dim unrelated flows |
| Hover link         | Show tooltip with flow details                     |

## 7.8 Data Aggregation

### Level 0 (No Tracing)

At Level 0, only port-level statistics are available. The Sankey diagram shows:

- Ports -> Outcome (allow/deny split)
- Other columns show "Tracing required for subject/role/policy breakdown"

### Level 1 (With Tracing)

Full 5-column Sankey with subject, role, policy, port, and outcome data.

## 7.9 Edge Cases

| Case                                 | Behavior                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| Single subject only                  | Subject column shows single node; still useful for role->port flow |
| No deny decisions                    | No deny outcome node; message "No denials in time range"           |
| All deny decisions                   | No allow outcome node; warning "All evaluations denied"            |
| Subject with many roles (> 5)        | Show top 5 roles by evaluation count, group rest as "Other"        |
| Very high cardinality subjects (>50) | Group by role instead of individual subject                        |
| No execution data (Level 0 only)     | Simplified 2-column view: Ports -> Outcomes                        |

## 7.10 Performance

| Metric              | Budget                                         |
| ------------------- | ---------------------------------------------- |
| Initial render      | < 200ms for 50 nodes, 100 links                |
| Re-render on filter | < 100ms                                        |
| Data refresh        | Debounced at 500ms for aggregate recalculation |
| SVG node limit      | 200 nodes maximum; group excess as "Other"     |

_Previous: [06-policy-path-explorer.md](06-policy-path-explorer.md) | Next: [08-evaluation-timeline.md](08-evaluation-timeline.md)_
