_Previous: [12-educational-features.md](12-educational-features.md) | Next: [14-integration.md](14-integration.md)_

# 13. Filter & Search System

Filtering and search capabilities across all Guard Panel views, enabling developers to narrow down to specific ports, subjects, roles, decisions, policy kinds, and time ranges.

## 13.1 Filter Dimensions

The Guard Panel supports 6 filter dimensions:

| Dimension   | Type           | Default     | Applies To                      |
| ----------- | -------------- | ----------- | ------------------------------- |
| Port        | Single-select  | All         | All views                       |
| Subject     | Single-select  | All         | Log, Sankey, Timeline           |
| Role        | Single-select  | All         | Sankey, Roles                   |
| Decision    | Multi-select   | All         | Log, Sankey, Overview, Paths    |
| Policy Kind | Multi-select   | All         | Tree, Log, Paths                |
| Time Range  | Range selector | Last 1 hour | Log, Sankey, Overview, Timeline |

## 13.2 Filter State Interface

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

  /** Filter to specific policy kinds. undefined = all kinds. */
  readonly policyKind: PolicyKind | undefined;

  /** Temporal window for aggregate data. */
  readonly timeRange: "5m" | "1h" | "24h" | "all" | { readonly from: number; readonly to: number };
}
```

## 13.3 Port Filter

### Dropdown UI

```
+--[Port: All v]-----------------------------------+
|  [Search ports...                             ]  |
|  ────────────────────────────────────────────── |
|  All (847 evaluations)                           |
|  ────────────────────────────────────────────── |
|  UserService      412 evals  ● 97% allow        |
|  PaymentPort      203 evals  ○ 72% allow        |
|  AdminPort        145 evals  ● 89% allow        |
|  ReportService     87 evals  ● 94% allow        |
+---------------------------------------------------+
```

### Behavior

- Type-ahead search filters the port list (150ms debounce)
- Each entry shows port name, evaluation count, and allow rate badge
- Allow rate badge uses color coding: green > 95%, amber 80-95%, red < 80%
- Selecting a port filters all views to show only that port's data

## 13.4 Subject Filter

### Dropdown UI

```
+--[Subject: All v]---------------------------------+
|  [Search subjects...                           ]  |
|  ────────────────────────────────────────────── |
|  All (42 subjects)                                |
|  ────────────────────────────────────────────── |
|  alice       312 evals  roles: admin, editor      |
|  bob         198 evals  roles: viewer             |
|  charlie     145 evals  roles: editor             |
|  eve         112 evals  roles: viewer             |
|  ... (38 more)                                    |
+----------------------------------------------------+
```

### Behavior

- Type-ahead search on subject ID (150ms debounce)
- Shows evaluation count and top roles for each subject
- Only available when Level 1 tracing provides subject data
- At Level 0: dropdown shows "Requires tracing for subject filter"

## 13.5 Role Filter

### Dropdown UI

```
+--[Role: All v]-----------------------------------+
|  All                                              |
|  ────────────────────────────────────────────── |
|  admin         4 subjects  524 evals             |
|  editor        8 subjects  312 evals             |
|  viewer       15 subjects  845 evals             |
|  auditor       2 subjects   67 evals             |
+---------------------------------------------------+
```

### Behavior

- Lists all roles observed in evaluation data
- Shows subject count and evaluation count per role
- Selecting a role filters Sankey to highlight that role's flows

## 13.6 Decision Filter

### Toggle UI

```
+--[Decision: All v]---+
|  All     (847)       |
|  ● Allow (824)       |
|  ○ Deny  (21)        |
|  ◆ Error (2)         |
+------------------------+
```

### Behavior

- Multi-select: can show "Allow + Error" but not "Deny"
- "All" resets to showing everything
- Counts update in real-time as new evaluations arrive
- Selecting "Deny" is a common debugging workflow; badge count helps gauge urgency

## 13.7 Policy Kind Filter

### Dropdown UI

```
+--[Policy Kind: All v]----------------------------+
|  All                                              |
|  ────────────────────────────────────────────── |
|  Compound:                                        |
|    ⊗ allOf         8 ports                       |
|    ⊕ anyOf         3 ports                       |
|    ⊘ not           1 port                        |
|  RBAC:                                            |
|    🔑 hasPermission  12 ports                    |
|    👤 hasRole         14 ports                   |
|  ABAC:                                            |
|    📋 hasAttribute    5 ports                    |
|    📦 hasResourceAttr 2 ports                    |
|  ReBAC:                                           |
|    🔗 hasRelationship 1 port                     |
|  Compliance:                                      |
|    ✍ hasSignature     2 ports                    |
+---------------------------------------------------+
```

### Behavior

- Groups policy kinds by category (Compound, RBAC, ABAC, ReBAC, Compliance)
- Shows icon and port count per kind
- Selecting a kind filters the Log to entries where that kind appears in the evaluation trace
- In Tree view, selecting a kind highlights matching nodes

## 13.8 Time Range Filter

### Dropdown UI

```
+--[Time Range: Last 1h v]------------------------+
|  Last 5 minutes                                   |
|  Last 1 hour                                      |
|  Last 24 hours                                    |
|  All time                                         |
|  ──────────────────────────────────────────────  |
|  Custom range...                                  |
|    From: [2024-01-15 14:00  ]                    |
|    To:   [2024-01-15 15:00  ]                    |
|    [Apply]                                        |
+---------------------------------------------------+
```

### Behavior

- Preset ranges: 5m, 1h, 24h, all
- Custom range via datetime pickers
- Affects: Log (filters entries), Sankey (aggregate window), Overview (stats window), Timeline (execution filter)
- Does not affect: Tree (shows selected execution regardless of time), Roles (structural view)

## 13.9 Global Search

A unified search bar accessible via `Ctrl+F`:

```
+--[Search: "payment"                          ]--[x]-----+
|                                                           |
|  Results (12 matches):                                    |
|  ────────────────────────────────────────────────────── |
|                                                           |
|  Ports (2):                                               |
|    PaymentPort — allOf(hasRole, hasPermission)           |
|    PaymentGateway — hasPermission("payment:process")     |
|                                                           |
|  Decisions (8):                                           |
|    #847 PaymentPort / bob / Deny / 14:32:01              |
|    #834 PaymentPort / charlie / Allow / 14:31:58         |
|    ... (6 more)                                           |
|                                                           |
|  Permissions (2):                                         |
|    payment:read — used in PaymentPort policy             |
|    payment:process — used in PaymentGateway policy       |
|                                                           |
+-----------------------------------------------------------+
```

### Search Scope

| Category    | What's Searched                                      |
| ----------- | ---------------------------------------------------- |
| Ports       | Port name                                            |
| Decisions   | Port name, subject ID, decision outcome, reason text |
| Permissions | Permission resource and action strings               |
| Roles       | Role names                                           |
| Policies    | Policy kind names, labels                            |
| Attributes  | Attribute names in HasAttribute policies             |
| Errors      | Error codes, error messages                          |

### Search Behavior

- Minimum 2 characters to trigger search
- Debounce: 200ms after typing stops
- Results grouped by category
- Click a result to navigate to it in the appropriate view
- Maximum 50 results per category (with "show more" link)

## 13.10 Filter Persistence

Active filters are:

- Preserved when switching between views
- Saved to `localStorage` as `hex-guard-filter-state`
- Restored on panel re-mount
- Reset via "Clear All Filters" button in toolbar

### Filter Badge

When filters are active, a badge appears on the toolbar:

```
[Filters: 2 active ●]
```

Clicking the badge opens a filter summary popover:

```
┌── Active Filters ──────────────────┐
│ Port: PaymentPort          [x]     │
│ Decision: Deny             [x]     │
│                                    │
│ [Clear All]                        │
└────────────────────────────────────┘
```

## 13.11 Filter Interaction with Views

| View     | Port | Subject | Role | Decision | Kind | Time Range |
| -------- | ---- | ------- | ---- | -------- | ---- | ---------- |
| Tree     | Yes  | --      | --   | --       | Yes  | --         |
| Log      | Yes  | Yes     | --   | Yes      | Yes  | Yes        |
| Paths    | Yes  | --      | --   | Yes      | --   | --         |
| Sankey   | Yes  | Yes     | Yes  | Yes      | --   | Yes        |
| Timeline | Yes  | Yes     | --   | --       | --   | Yes        |
| Roles    | --   | --      | Yes  | --       | --   | --         |
| Overview | Yes  | --      | --   | Yes      | --   | Yes        |

Filters not applicable to a view are hidden from the toolbar when that view is active.

## 13.12 Edge Cases

| Case                               | Behavior                                        |
| ---------------------------------- | ----------------------------------------------- |
| Filter yields 0 results            | Empty state: "No evaluations match filters"     |
| Search with special characters     | Escaped for regex safety; literal matching      |
| Very long subject ID (> 40 chars)  | Truncated in dropdown; full ID in tooltip       |
| Filter change during animation     | Animation cancelled; new data rendered directly |
| Time range "All" with 100k entries | Virtualized list; aggregates computed lazily    |

_Previous: [12-educational-features.md](12-educational-features.md) | Next: [14-integration.md](14-integration.md)_
