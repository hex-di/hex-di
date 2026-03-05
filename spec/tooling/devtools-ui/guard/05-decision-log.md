_Previous: [04-policy-evaluation-tree.md](04-policy-evaluation-tree.md) | Next: [06-policy-path-explorer.md](06-policy-path-explorer.md)_

# 5. Decision Log View

The Decision Log provides a chronological record of all guard evaluation decisions, modeled after a production audit trail. Every allow, deny, and error event is captured with full context: who (subject), what (port), when (timestamp), why (policy tree trace), and outcome (allow/deny/error).

## 5.1 Design Philosophy

The Decision Log serves two audiences:

1. **Developers debugging denials** -- "Why was bob denied access to PaymentPort?" Click the deny entry, see the evaluation trace, find the exact policy node that denied.
2. **Auditors reviewing access patterns** -- "Who accessed AdminPort in the last hour?" Filter by port, scan the log, verify expected subjects.

## 5.2 Wireframe

```
+--[Port: All v]--[Subject: All v]--[Decision: All v]--[Search]--[Export]---+
|                                                                            |
|  # | Timestamp        | Port          | Subject  | Decision | Policy | ms |
|  --|------------------|---------------|----------|----------|--------|-----|
|  1 | 14:32:01.423     | UserService   | alice    | ● Allow  | allOf  |0.15|
|  2 | 14:32:01.381     | PaymentPort   | bob      | ○ Deny   | hasRole|0.08|
|  3 | 14:32:01.204     | ReportService | charlie  | ● Allow  | anyOf  |1.20|
|  4 | 14:32:00.987     | UserService   | eve      | ○ Deny   | allOf  |0.32|
|  5 | 14:31:59.112     | AdminPort     | alice    | ● Allow  | hasRole|0.05|
|  6 | 14:31:58.890     | UserService   | alice    | ● Allow  | allOf  |0.14|
|  7 | 14:31:58.001     | PaymentPort   | charlie  | ◆ Error  | allOf  | -- |
|                                                                            |
|  Showing 7 of 847 entries (filtered: Port=All, Decision=All)              |
+---+------------------------------------------------------------------------+
|   |  Decision #2: PaymentPort / bob                                        |
|   |                                                                        |
|   |  ┌── Subject ─────────────────────────────────────┐                    |
|   |  │ id: "bob"                                      │                    |
|   |  │ roles: ["viewer"]                              │                    |
|   |  │ permissions: ["doc:read"]                      │                    |
|   |  │ auth: "jwt" at 14:30:00                        │                    |
|   |  └────────────────────────────────────────────────┘                    |
|   |                                                                        |
| D |  ┌── Evaluation Trace ────────────────────────────┐                    |
| e |  │ HasRole "payment-admin": ○ DENY                │                    |
| t |  │   reason: subject lacks role 'payment-admin'   │                    |
| a |  │   subject roles: ["viewer"]                    │                    |
| i |  │   duration: 0.08ms                             │                    |
| l |  └────────────────────────────────────────────────┘                    |
|   |                                                                        |
|   |  ┌── Audit Context ──────────────────────────────┐                     |
|   |  │ evaluationId: "eval-847"                      │                     |
|   |  │ portName: "PaymentPort"                       │                     |
|   |  │ decision: "deny"                              │                     |
|   |  │ reason: "subject lacks role 'payment-admin'"  │                     |
|   |  │ durationMs: 0.08                              │                     |
|   |  │ evaluatedAt: "2024-01-15T14:32:01.381Z"      │                     |
|   |  └───────────────────────────────────────────────┘                     |
|   |                                                                        |
|   |  [View in Tree >>]  [Copy as JSON]  [Go to Audit Entry]               |
+---+------------------------------------------------------------------------+
```

## 5.3 Log Entry Columns

| Column    | Content                                    | Width | Sortable |
| --------- | ------------------------------------------ | ----- | -------- |
| #         | Sequential entry number (newest = highest) | 48px  | No       |
| Timestamp | ISO 8601 with milliseconds                 | 140px | Yes      |
| Port      | Port name                                  | 140px | Yes      |
| Subject   | Subject ID (truncated to 12 chars)         | 100px | Yes      |
| Decision  | Allow/Deny/Error badge                     | 80px  | Yes      |
| Policy    | Root policy kind                           | 80px  | Yes      |
| Duration  | Evaluation duration in ms                  | 60px  | Yes      |

### Default Sort

Newest first (descending by timestamp).

### Column Interactions

- Click column header to sort (toggle ascending/descending)
- Active sort column has arrow indicator
- Drag column borders to resize (minimum 48px)

## 5.4 Decision Badges

| Badge | Display   | Background                | Text                |
| ----- | --------- | ------------------------- | ------------------- |
| Allow | `● Allow` | `--hex-guard-allow-muted` | `--hex-guard-allow` |
| Deny  | `○ Deny`  | `--hex-guard-deny-muted`  | `--hex-guard-deny`  |
| Error | `◆ Error` | `--hex-guard-error-muted` | `--hex-guard-error` |

Badge dimensions: `height: 20px`, `padding: 2px 8px`, `border-radius: 10px`, `font-size: 11px`, `font-weight: 600`.

## 5.5 Inline Filters

The toolbar provides quick filters:

### Port Filter

```
+--[Port: All v]-------------------+
|  All                              |
|  ────────────────                |
|  UserService (412 entries)       |
|  PaymentPort (203 entries)       |
|  AdminPort (145 entries)         |
|  ReportService (87 entries)      |
+-----------------------------------+
```

### Subject Filter

```
+--[Subject: All v]-----------------+
|  All                               |
|  ────────────────                 |
|  alice (312 entries)              |
|  bob (198 entries)                |
|  charlie (145 entries)            |
|  eve (112 entries)                |
|  [Search...                    ]  |
+------------------------------------+
```

### Decision Filter

```
+--[Decision: All v]---+
|  All                  |
|  ● Allow (824)       |
|  ○ Deny (21)         |
|  ◆ Error (2)         |
+------------------------+
```

## 5.6 Detail Panel: Subject Section

Displays the serialized subject from the evaluation:

```
┌── Subject ──────────────────────────┐
│ id: "bob"                           │
│ roles: ["viewer"]                   │
│ permissions: ["doc:read"]           │
│ attributes:                         │
│   ▸ { department: "sales",         │
│       level: 3,                     │
│       location: "US" }             │
│ auth: "jwt"                         │
│ authenticatedAt: "14:30:00"        │
│ identityProvider: "auth0"          │
└─────────────────────────────────────┘
```

Attributes use the `JsonTree` component for expandable/collapsible display.

## 5.7 Detail Panel: Evaluation Trace Section

Renders the `EvaluationNodeTrace` tree in a compact inline format:

### Simple Policy (single leaf)

```
HasRole "payment-admin": ○ DENY
  reason: subject lacks role 'payment-admin'
  subject roles: ["viewer"]
  duration: 0.08ms
```

### Compound Policy

```
AllOf: ○ DENY (1/2 children denied)
├── HasRole "admin": ● ALLOW (0.02ms)
│     subject has role 'admin'
└── AnyOf: ○ DENY (0/2 children allowed)
    ├── HasPermission "payment:write": ○ DENY (0.03ms)
    │     subject lacks permission 'payment:write'
    └── HasAttribute "clearance" gte(5): ○ DENY (0.05ms)
          resolved value: 3, matcher: gte(5), match: false
```

Each trace node shows:

- Policy kind and identifier
- Decision badge
- Duration
- Reason for deny
- Resolved values (for attribute/relationship policies)
- Short-circuit indicator (for skipped nodes)

## 5.8 Detail Panel: Audit Context Section

Maps to the `AuditEntry` structure:

```
┌── Audit Context ──────────────────────┐
│ evaluationId: "eval-847"              │
│ portName: "PaymentPort"               │
│ subjectId: "bob"                      │
│ decision: "deny"                      │
│ reason: "subject lacks role..."       │
│ durationMs: 0.08                      │
│ evaluatedAt: "2024-01-15T14:32:01Z"  │
│ authMethod: "jwt"                     │
│ scopeId: "request-123"               │
└───────────────────────────────────────┘
```

## 5.9 Detail Panel: Action Buttons

| Button            | Action                                                               |
| ----------------- | -------------------------------------------------------------------- |
| View in Tree >>   | Navigate to Policy Evaluation Tree view with this execution selected |
| Copy as JSON      | Copy the full execution object to clipboard as JSON                  |
| Go to Audit Entry | Navigate to the audit trail (external link if configured)            |

## 5.10 Real-Time Updates

When connected to a live container:

- New decisions appear at the top of the log with a brief slide-in animation
- The "new" badge pulses for 2 seconds on fresh entries
- Counters in filter dropdowns update in real-time
- Auto-scroll follows new entries when scrolled to top (opt-out via scroll-away)

### Update Debouncing

| Trigger            | Debounce        |
| ------------------ | --------------- |
| New decision event | 16ms (frame)    |
| Filter change      | 150ms           |
| Sort change        | 0ms (immediate) |

## 5.11 Virtualization

The log uses virtual scrolling for performance:

- Only renders visible rows + 10 row overscan above/below
- Row height: 36px fixed
- Scroll position preserved during filter/sort changes when possible
- Maximum 10,000 entries in the ring buffer

## 5.12 Error Entries

Error entries (from `GuardErrorEvent`) display differently:

```
  7 | 14:31:58.001 | PaymentPort | charlie | ◆ Error | allOf | --

Detail:
  ┌── Error ────────────────────────────────┐
  │ errorCode: "ACL018"                     │
  │ message: "Attribute resolver timeout"   │
  │ attribute: "clearanceLevel"             │
  │ timeoutMs: 5000                         │
  │                                         │
  │ Subject: charlie                        │
  │ Port: PaymentPort                       │
  │ Timestamp: 14:31:58.001                 │
  └─────────────────────────────────────────┘
```

## 5.13 Edge Cases

| Case                        | Behavior                                                   |
| --------------------------- | ---------------------------------------------------------- |
| Empty log (no evaluations)  | Message: "No guard evaluations recorded yet"               |
| Subject with very long ID   | Truncate to 12 chars with tooltip showing full ID          |
| Rapid evaluations (> 100/s) | Batch UI updates per animation frame; show "X new" counter |
| Error without trace data    | Show error details without evaluation trace section        |
| Duplicate evaluation IDs    | Display warning badge; should not happen in practice       |

_Previous: [04-policy-evaluation-tree.md](04-policy-evaluation-tree.md) | Next: [06-policy-path-explorer.md](06-policy-path-explorer.md)_
