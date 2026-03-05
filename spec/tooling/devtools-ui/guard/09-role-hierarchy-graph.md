_Previous: [08-evaluation-timeline.md](08-evaluation-timeline.md) | Next: [10-visual-encoding.md](10-visual-encoding.md)_

# 9. Role Hierarchy Graph View

The Role Hierarchy Graph visualizes the role inheritance DAG (Directed Acyclic Graph) with permission flattening at each node. It answers: "How do roles compose? What permissions does a role inherit? Are there cycles or redundancies?"

## 9.1 Core Concept

Roles in `@hex-di/guard` form a DAG through inheritance:

```typescript
const viewer = createRole({ name: "viewer", permissions: [docRead], inherits: [] });
const editor = createRole({ name: "editor", permissions: [docWrite], inherits: [viewer] });
const admin = createRole({ name: "admin", permissions: [userAll], inherits: [editor] });
```

This produces:

```
admin (user:*, doc:write, doc:read)
  └── editor (doc:write, doc:read)
        └── viewer (doc:read)
```

The graph view renders this as a navigable DAG with permission badges at each node.

## 9.2 Wireframe

```
+--[Search: ________]--[Show Permissions: On v]--[Detect Cycles: On v]-------+
|                                                                              |
|                     ┌────────────────┐                                       |
|                     │  superAdmin    │                                       |
|                     │  ──────────    │                                       |
|                     │  Direct: *     │                                       |
|                     │  Total: 12     │                                       |
|                     └───────┬────────┘                                       |
|                             │                                                |
|                ┌────────────┼────────────┐                                   |
|                │                         │                                   |
|        ┌───────┴────────┐      ┌────────┴───────┐                           |
|        │     admin      │      │    auditor     │                           |
|        │  ──────────    │      │  ──────────    │                           |
|        │  Direct: 3     │      │  Direct: 2     │                           |
|        │  Inherited: 4  │      │  Total: 2      │                           |
|        │  Total: 7      │      │                │                           |
|        └───────┬────────┘      └────────────────┘                           |
|                │                                                             |
|       ┌────────┼────────┐                                                    |
|       │                 │                                                    |
| ┌─────┴──────┐  ┌──────┴─────┐                                             |
| │   editor   │  │   viewer   │                                              |
| │ ──────── │  │ ──────── │                                              |
| │ Direct: 2 │  │ Direct: 1  │                                              |
| │ Inherited:1│  │ Total: 1   │                                              |
| │ Total: 3   │  │            │                                              |
| └─────┬──────┘  └────────────┘                                             |
|       │                                                                      |
|       └──── (inherits viewer)                                               |
|                                                                              |
+--[Detail Panel]------------------------------------------------------------+
|                                                                              |
|  Selected: admin                                                             |
|                                                                              |
|  Direct permissions:                                                         |
|    user:read, user:write, user:delete                                       |
|                                                                              |
|  Inherited permissions (from editor):                                        |
|    doc:write, doc:read                                                       |
|                                                                              |
|  Inherited permissions (from viewer, via editor):                            |
|    doc:read (already from editor -- redundant)                              |
|                                                                              |
|  Flattened (deduplicated): 5 unique permissions                             |
|    user:read, user:write, user:delete, doc:write, doc:read                  |
|                                                                              |
|  Subjects with this role: alice, charlie (2 subjects)                       |
|                                                                              |
+------------------------------------------------------------------------------+
```

## 9.3 Graph Layout

### Layout Algorithm

The graph uses a layered (Sugiyama) layout algorithm:

1. **Layer assignment**: Roles with no parents are layer 0 (top). Each role's layer = max(parent layers) + 1.
2. **Crossing minimization**: Minimize edge crossings within each layer.
3. **Coordinate assignment**: Center nodes within layers; space evenly.

### Node Dimensions

| Property      | Value                            |
| ------------- | -------------------------------- |
| Width         | 160px                            |
| Height        | 80px (compact), 120px (expanded) |
| Border radius | 8px                              |
| Spacing H     | 40px minimum between siblings    |
| Spacing V     | 60px between layers              |

### Edge Rendering

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| Stroke color | `--hex-text-muted` at 60%                       |
| Stroke width | 2px                                             |
| Style        | Solid with arrowhead at child end               |
| Curve        | Cubic bezier for non-adjacent layer connections |
| Label        | "inherits" on hover                             |

## 9.4 Role Node Rendering

### Standard Node

```
┌────────────────────┐
│  👤  admin         │   ← Icon + role name (bold)
│  ──────────────    │
│  Direct: 3         │   ← Direct permission count
│  Inherited: 4      │   ← Inherited permission count
│  Total: 7          │   ← Flattened total
└────────────────────┘
```

### Node Colors

| State          | Border Color              | Background                |
| -------------- | ------------------------- | ------------------------- |
| Default        | `--hex-border`            | `--hex-surface`           |
| Selected       | `--hex-accent`            | `--hex-accent` at 10%     |
| Hovered        | `--hex-accent` at 60%     | `--hex-surface-hover`     |
| Circular error | `--hex-guard-error`       | `--hex-guard-error-muted` |
| No subjects    | `--hex-text-muted` at 40% | `--hex-surface` at 60%    |

### Expanded Node (show permissions inline)

```
┌──────────────────────────┐
│  👤  admin               │
│  ──────────────          │
│  Direct:                 │
│    🔑 user:read          │
│    🔑 user:write         │
│    🔑 user:delete        │
│  Inherited:              │
│    🔑 doc:write (editor) │
│    🔑 doc:read (viewer)  │
│  Total: 5 unique         │
└──────────────────────────┘
```

## 9.5 Permission Display Modes

### Compact Mode (default)

Shows permission counts only (Direct, Inherited, Total).

### Expanded Mode ("Show Permissions: On")

Each node lists its permissions inline. Inherited permissions show the source role in parentheses.

### Permission Badges

Permission strings are rendered as badges:

```
┌──────────────┐
│ 🔑 user:read │
└──────────────┘
```

| Property    | Value                                |
| ----------- | ------------------------------------ |
| Background  | `--hex-cat-constructor` at 15%       |
| Text color  | `--hex-text`                         |
| Icon        | `🔑` (key) 12px                      |
| Font        | Monospace, 11px                      |
| Padding     | 2px 6px                              |
| Max display | 8 permissions inline; "+N more" link |

## 9.6 Cycle Detection

When `Detect Cycles: On`, the graph checks for circular inheritance:

### Cycle Visualization

```
┌─────────────────┐
│ ⚠ roleA         │ ←── Red dashed border
│  inherits roleB │
└────────┬────────┘
         │ ← Red edge
┌────────┴────────┐
│ ⚠ roleB         │ ←── Red dashed border
│  inherits roleA │
└────────┬────────┘
         │ ← Red edge (cycle!)
         └──→ (back to roleA)
```

- Cycle-participating nodes have red dashed borders
- Cycle edges are red with a "cycle" label
- Warning banner: "Circular inheritance detected: roleA -> roleB -> roleA"
- Tooltip: "Error code ACL002: CircularRoleInheritanceError"

### Cycle Handling

| Case                          | Behavior                                     |
| ----------------------------- | -------------------------------------------- |
| Direct self-inheritance       | Single node with red self-loop edge          |
| Two-node cycle (A <-> B)      | Both nodes highlighted; cycle edge labeled   |
| Multi-node cycle (A->B->C->A) | All participating nodes highlighted          |
| Cycle in sub-graph            | Only affected nodes highlighted; rest normal |

## 9.7 Detail Panel

When a role is selected, the detail panel shows:

### Permission Breakdown

```
┌── admin ──────────────────────────────────────────┐
│                                                    │
│ Direct permissions (3):                            │
│   🔑 user:read                                    │
│   🔑 user:write                                   │
│   🔑 user:delete                                  │
│                                                    │
│ Inherited from editor (2):                         │
│   🔑 doc:write                                    │
│   🔑 doc:read                                     │
│                                                    │
│ Inherited from viewer (via editor) (1):            │
│   🔑 doc:read  ← (redundant, already from editor) │
│                                                    │
│ Flattened total: 5 unique permissions              │
│   user:read, user:write, user:delete,             │
│   doc:write, doc:read                              │
│                                                    │
│ Subjects with this role (2):                       │
│   alice, charlie                                   │
│                                                    │
│ Separation of Duties:                              │
│   No conflicts detected                            │
└────────────────────────────────────────────────────┘
```

### Redundancy Detection

Permissions inherited from multiple paths are flagged as "redundant" (informational, not an error). This helps identify opportunities to simplify the role hierarchy.

### Separation of Duties

If `MutuallyExclusiveRoles` constraints are registered, the detail panel shows:

```
Separation of Duties:
  ⚠ Conflict: "admin" and "auditor" are mutually exclusive
    Reason: "Segregation of duties per SOX compliance"
    Affected subjects: none (no subject has both)
```

## 9.8 Search

The search box filters the graph to roles matching the query:

- Matches role name substring (case-insensitive)
- Matches permission string substring
- Matched nodes are highlighted; unmatched nodes are dimmed at 30% opacity
- Ancestor/descendant nodes of matches remain visible but dimmed at 60%

## 9.9 Interactions

| Interaction       | Effect                                           |
| ----------------- | ------------------------------------------------ |
| Click node        | Select role, show detail panel                   |
| Double-click node | Toggle expanded/compact mode for that node       |
| Hover node        | Highlight node and all ancestor/descendant edges |
| Hover edge        | Show "inherits" label; highlight connected nodes |
| Mouse wheel       | Zoom centered on cursor                          |
| Click+drag bg     | Pan the viewport                                 |
| Keyboard arrows   | Navigate between nodes (layer order)             |
| Enter             | Select focused node                              |
| Escape            | Deselect, close detail panel                     |
| Fit button        | Zoom/pan to show entire graph                    |

## 9.10 Data Source

The role hierarchy is built from:

1. **Role registry**: All roles registered via `createRole()` in the container
2. **Runtime subject data**: Subjects from recent evaluations provide "subjects with this role" data
3. **SoD constraints**: Registered `MutuallyExclusiveRoles` from the guard configuration

### Level 0 (Partial)

At Level 0, the role hierarchy is available if roles are registered as typed tokens. Subject-to-role mapping requires Level 1 tracing (execution data with subject snapshots).

### Level 1 (Full)

Full role hierarchy with subject mapping, permission flattening, and SoD analysis.

## 9.11 Edge Cases

| Case                                         | Behavior                                             |
| -------------------------------------------- | ---------------------------------------------------- |
| No roles registered                          | Empty graph; message "No roles registered"           |
| Single role (no hierarchy)                   | Single node centered; detail panel shows permissions |
| Very deep hierarchy (> 10)                   | Auto-collapse intermediate layers; expand on click   |
| Very wide hierarchy (> 30 roles)             | Minimap for navigation; zoom to fit                  |
| Role with no permissions                     | Node shows "0 permissions"; dimmed styling           |
| Diamond inheritance (A->B, A->C, B->D, C->D) | D appears once with edges from both B and C          |

_Previous: [08-evaluation-timeline.md](08-evaluation-timeline.md) | Next: [10-visual-encoding.md](10-visual-encoding.md)_
