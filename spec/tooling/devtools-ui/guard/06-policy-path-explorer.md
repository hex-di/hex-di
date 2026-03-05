_Previous: [05-decision-log.md](05-decision-log.md) | Next: [07-access-flow-statistics.md](07-access-flow-statistics.md)_

# 6. Policy Path Explorer View

The Policy Path Explorer enumerates all possible evaluation paths through a compound policy tree and overlays runtime frequency data from observed executions. It answers: "What are all the ways this policy tree can evaluate, and which paths actually occur?"

## 6.1 Core Concept

A compound policy like `AllOf(HasRole("admin"), AnyOf(HasPerm(P), HasAttr("dept", eq("eng"))))` has multiple evaluation paths depending on which nodes allow or deny:

- **Path 1**: HasRole=allow, AnyOf: HasPerm=allow -> skip HasAttr -> **ALLOW** (72.3%)
- **Path 2**: HasRole=allow, AnyOf: HasPerm=deny, HasAttr=allow -> **ALLOW** (20.1%)
- **Path 3**: HasRole=allow, AnyOf: HasPerm=deny, HasAttr=deny -> **DENY** (5.0%)
- **Path 4**: HasRole=deny -> short-circuit AllOf -> **DENY** (2.6%)

The Path Explorer computes these statically from the policy tree structure, then overlays observed execution frequencies.

## 6.2 Wireframe

```
+--[Port: UserService]--[Observed: 870 evals]--[Simulate >>]--[Reset]------+
|                                                                            |
|  Path Tree:                                                                |
|                                                                            |
|  AllOf ── HasRole ──┬── allow ── AnyOf ──┬── HasPerm ── allow ── [ALLOW] |
|                     │                     │   72.3%  (629)  ////////////   |
|                     │                     │                                |
|                     │                     ├── HasPerm ── deny              |
|                     │                     │   └── HasAttr ── allow         |
|                     │                     │       ── [ALLOW]               |
|                     │                     │       20.1%  (175)  ////////   |
|                     │                     │                                |
|                     │                     └── HasPerm ── deny              |
|                     │                         └── HasAttr ── deny          |
|                     │                             ── [DENY]                |
|                     │                             5.0%  (43)  ///          |
|                     │                                                      |
|                     └── deny ── [DENY] (short-circuit)                    |
|                         2.6%  (23)  //                                     |
|                                                                            |
|  Total paths: 4  |  Allow paths: 2 (92.4%)  |  Deny paths: 2 (7.6%)     |
|                                                                            |
|  ┌── Coverage ────────────────────────────────────────────────────────┐    |
|  │ Paths observed: 4/4 (100%)  |  Leaf nodes hit: 5/5 (100%)        │    |
|  └────────────────────────────────────────────────────────────────────┘    |
|                                                                            |
+---+------------------------------------------------------------------------+
| P |  Path #2: HasRole=allow -> HasPerm=deny -> HasAttr=allow -> ALLOW     |
| a |  Frequency: 20.1% (175 / 870 evaluations)                             |
| t |  Final outcome: ALLOW                                                  |
| h |  Key decision point: HasAttribute "dept" eq("eng")                     |
|   |  Description: "Permission denied but attribute match succeeds"        |
| D |  Last seen: 2 minutes ago                                              |
| e |                                                                        |
| t |  Example execution: #834                                               |
| a |    Subject: charlie (roles: ["editor"], dept: "eng")                   |
| i |    HasRole "admin": allow (subject has role)                           |
| l |    HasPermission "user:write": deny (missing permission)              |
|   |    HasAttribute "dept" eq("eng"): allow (resolved: "eng")             |
+---+------------------------------------------------------------------------+
```

## 6.3 Path Computation

### Static Path Enumeration

Paths are computed by traversing the policy tree and expanding at each branch point:

| Node Kind | Branching Rule                                                     |
| --------- | ------------------------------------------------------------------ |
| AllOf     | Each child can allow or deny. AllOf short-circuits on first deny.  |
| AnyOf     | Each child can allow or deny. AnyOf short-circuits on first allow. |
| Not       | Single child. Result is inverted.                                  |
| Labeled   | Transparent. Delegates to wrapped policy.                          |
| Leaf      | Two outcomes: allow or deny.                                       |

### Short-Circuit Expansion

For `AllOf(A, B, C)`:

- Path 1: A=allow, B=allow, C=allow -> ALLOW
- Path 2: A=allow, B=allow, C=deny -> DENY
- Path 3: A=allow, B=deny -> DENY (C skipped)
- Path 4: A=deny -> DENY (B, C skipped)

For `AnyOf(A, B, C)`:

- Path 1: A=allow -> ALLOW (B, C skipped)
- Path 2: A=deny, B=allow -> ALLOW (C skipped)
- Path 3: A=deny, B=deny, C=allow -> ALLOW
- Path 4: A=deny, B=deny, C=deny -> DENY

### Path Explosion Limit

For very complex policies, the number of paths can grow exponentially. Safety limits:

| Constraint       | Limit                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| Max paths        | 256 paths. Beyond this, show "Too many paths. Showing top 256 by frequency."     |
| Max tree depth   | 20 levels. Beyond this, deep branches are collapsed.                             |
| Computation time | 100ms budget. Exceeding triggers background computation with progress indicator. |

## 6.4 Runtime Frequency Overlay

When execution data is available (Level 1 tracing), each path shows:

### Frequency Bar

```
Path 1: AllOf -> HasRole:allow -> AnyOf -> HasPerm:allow -> [ALLOW]
  72.3%  (629 / 870 evals)  ////////////////////////
```

- Bar width proportional to frequency (100% = full width)
- Bar color: green for ALLOW paths, red for DENY paths
- Tooltip: "629 of 870 evaluations took this path (72.3%)"

### No-Data State

When no executions are observed:

- Frequency shows "-- (no data)"
- Bar is hidden
- Message: "Run evaluations to see path frequencies"

## 6.5 Coverage Analysis

```
┌── Coverage ─────────────────────────────┐
│ Paths observed: 3/4 (75%)               │
│   Missing: Path 4 (HasRole=deny)        │
│ Leaf nodes hit: 4/5 (80%)               │
│   Never hit: HasRelationship "owns"     │
│ Decision outcomes: allow=2, deny=1      │
│   Missing: deny via attribute mismatch  │
└──────────────────────────────────────────┘
```

Coverage highlights untested paths in amber, prompting developers to verify edge cases.

## 6.6 What-If Subject Simulation

The simulation controls let users test hypothetical subjects against the policy tree:

```
┌── What-If Simulation ──────────────────────────────┐
│ Subject ID: [test-user           ]                  │
│ Roles:      [admin, viewer       ] [+ Add]          │
│ Permissions:[user:read           ] [+ Add]          │
│ Attributes:                                         │
│   dept:     [engineering         ]                  │
│   level:    [5                   ]                  │
│                                                     │
│ [Evaluate >>]                                       │
│                                                     │
│ Result: ● ALLOW via Path #1                         │
│   HasRole "admin": allow                            │
│   HasPermission "user:read": allow                  │
│   (AnyOf short-circuited)                           │
└─────────────────────────────────────────────────────┘
```

### Simulation Features

| Feature               | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| Role toggle           | Add/remove roles to see how decisions change               |
| Permission toggle     | Add/remove permissions                                     |
| Attribute editing     | Change attribute values (string, number, boolean)          |
| Instant re-evaluation | Decision updates immediately on any change                 |
| Path highlighting     | The path taken by the simulated subject is highlighted     |
| Diff mode             | Show "was deny, now allow" when toggling a role/permission |

### Presets

| Preset         | Description                                |
| -------------- | ------------------------------------------ |
| Empty subject  | No roles, no permissions, no attributes    |
| Recent subject | Clone from a recent execution's subject    |
| Minimal allow  | Auto-compute minimum roles/perms for allow |

## 6.7 Path Detail Panel

When a path is selected, the detail panel shows:

- **Path sequence**: Ordered list of node outcomes
- **Frequency**: Percentage and absolute count
- **Final outcome**: Allow or Deny badge
- **Key decision point**: The node that determined the outcome
- **Description**: Auto-generated human-readable description
- **Last seen**: Timestamp of most recent execution on this path
- **Example execution**: Link to a specific execution that took this path

## 6.8 Edge Cases

| Case                                   | Behavior                                               |
| -------------------------------------- | ------------------------------------------------------ |
| No compound policies (single leaf)     | Single path with two outcomes; simplified display      |
| Path never observed                    | Frequency: "-- (never observed)"; amber highlight      |
| All paths lead to deny                 | Warning: "All paths deny. Check policy configuration." |
| All paths lead to allow                | Info: "All paths allow. Policy may be too permissive." |
| Simulation subject matches no policies | Show "DENY (no matching policy)" result                |
| Very deep nesting (>10 levels)         | Collapse intermediate nodes; expand on click           |

_Previous: [05-decision-log.md](05-decision-log.md) | Next: [07-access-flow-statistics.md](07-access-flow-statistics.md)_
