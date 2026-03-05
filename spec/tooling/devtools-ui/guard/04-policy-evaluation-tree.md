_Previous: [03-views-and-wireframes.md](03-views-and-wireframes.md) | Next: [05-decision-log.md](05-decision-log.md)_

# 4. Policy Evaluation Tree View

The Policy Evaluation Tree is the primary view of the Guard Panel. It renders compound policy structures as interactive trees where each node shows its allow/deny/skip outcome, making the evaluation logic visible at every level.

## 4.1 Core Metaphor

Policies are trees. `AllOf`, `AnyOf`, and `Not` are branch nodes; `HasPermission`, `HasRole`, `HasAttribute`, `HasResourceAttribute`, `HasSignature`, and `HasRelationship` are leaf nodes. The tree visualization shows:

- **Static structure** (no execution selected): The policy tree with neutral styling, showing all possible branches.
- **Runtime overlay** (execution selected): Each node colored green (allow), red (deny), or gray-dashed (skip/short-circuited), with timing and resolved values.

## 4.2 Wireframe

```
+--[Port Selector: v UserService     ]--[Execution: #847 v]--[Play >>]-----+
|                                                                            |
|                        ┌─────────────┐                                     |
|                        │   AllOf     │                                     |
|                        │  ● allow    │                                     |
|                        │  0.15ms     │                                     |
|                        └──────┬──────┘                                     |
|                    ┌──────────┴──────────┐                                 |
|              ┌─────┴─────┐        ┌─────┴─────┐                           |
|              │ HasRole   │        │   AnyOf   │                           |
|              │ "admin"   │        │  ● allow  │                           |
|              │ ● allow   │        │  0.12ms   │                           |
|              │ 0.02ms    │        └─────┬─────┘                           |
|              └───────────┘     ┌────────┴────────┐                        |
|                          ┌────┴─────┐     ┌─────┴──────┐                  |
|                          │ HasPerm  │     │ HasAttr    │                  |
|                          │ user:read│     │ dept=eng   │                  |
|                          │ ● allow  │     │ ○ skip     │                  |
|                          │ 0.05ms   │     │ --         │                  |
|                          └──────────┘     └────────────┘                  |
|                                                                            |
|  ┌── Legend ──────────────────────────────────────────────────────────┐    |
|  │ ● Allow (green)  ○ Deny (red)  ◌ Skip (gray dashed)  ◆ Error    │    |
|  └────────────────────────────────────────────────────────────────────┘    |
+--------+------------------------------------------------------------------+
| Node   |  Selected: AllOf                                                  |
| Detail |  Kind: allOf (compound AND)                                       |
|        |  Result: allow (all 2 children allowed)                           |
|        |  Field strategy: intersection                                     |
|        |  Duration: 0.15ms (total tree)                                    |
|        |  Children: HasRole "admin", AnyOf(HasPermission, HasAttribute)    |
+--------+------------------------------------------------------------------+
```

## 4.3 Tree Layout Algorithm

### Node Positioning

- **Root** is centered at the top of the canvas
- **Children** are distributed horizontally below their parent, evenly spaced
- **Edge connections** are drawn as vertical-then-horizontal connectors (orthogonal routing)
- **Minimum node spacing**: 24px horizontal, 48px vertical
- **Node dimensions**: 120px width, 64px height (compact), 160px width, 80px height (expanded)

### Layout Modes

| Mode       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| Top-down   | Root at top, children below (default)                                 |
| Left-right | Root at left, children to the right (for very deep trees)             |
| Radial     | Root at center, children arranged in concentric arcs (for wide trees) |

The layout mode auto-selects based on tree shape: top-down for `maxDepth <= 5`, left-right for `maxDepth > 5 && leafCount <= 20`, radial for `leafCount > 20`.

## 4.4 Node Rendering

### Compound Nodes (AllOf, AnyOf, Not, Labeled)

```
┌─────────────────────┐
│  ⊕  AllOf           │   ← Icon + kind name
│  ● allow  0.15ms    │   ← Outcome badge + duration
│  2/2 children allow │   ← Children summary
└─────────────────────┘
```

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Border color   | `--hex-guard-allow` (green) or `--hex-guard-deny` (red)   |
| Background     | `--hex-guard-allow-muted` or `--hex-guard-deny-muted`     |
| Icon           | Kind-specific (see [Section 10.2](10-visual-encoding.md)) |
| Children count | "N/M children allow" for AllOf; "N of M allow" for AnyOf  |
| Not indicator  | Inverted outcome display ("NOT: deny -> allow")           |

### Leaf Nodes

```
┌─────────────────────┐
│  🔑  HasPermission  │   ← Icon + kind name
│  user:read          │   ← Leaf-specific data
│  ● allow  0.05ms    │   ← Outcome badge + duration
└─────────────────────┘
```

| Property          | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Border color      | Matches outcome color                                              |
| Background        | Muted version of outcome color                                     |
| Leaf data display | Permission string, role name, attribute condition, or relationship |
| Resolved value    | Shown on hover or in detail panel (for HasAttribute)               |

### Skip State (Short-Circuited)

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  ◌  HasAttribute       ← Gray icon
  dept=eng              ← Leaf data (dimmed)
  skip (short-circuit)  ← Skip indicator
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- Dashed border at 30% opacity
- All text at 50% opacity
- Tooltip: "Short-circuited: AnyOf already allowed from sibling HasPermission"

## 4.5 Edge Rendering

### Active Edges (evaluated path)

| Property     | Value                                     |
| ------------ | ----------------------------------------- |
| Stroke       | `--hex-guard-allow` or `--hex-guard-deny` |
| Stroke width | 2px                                       |
| Style        | Solid                                     |
| Arrow        | 6px arrowhead at child end                |

### Inactive Edges (to skipped nodes)

| Property     | Value                      |
| ------------ | -------------------------- |
| Stroke       | `--hex-text-muted` at 30%  |
| Stroke width | 1px                        |
| Style        | Dashed (4px dash, 4px gap) |

### No-Execution Mode (static structure)

| Property     | Value                     |
| ------------ | ------------------------- |
| Stroke       | `--hex-text-muted` at 50% |
| Stroke width | 1.5px                     |
| Style        | Solid, neutral color      |

## 4.6 Port Selector

The port selector dropdown lists all guarded ports with their policy summary:

```
+--[ v UserService ]----------------------------------+
|  UserService                                         |
|    allOf(hasRole, anyOf(...))  |  Allow: 97%        |
|  PaymentPort                                         |
|    hasRole("payment-admin")   |  Allow: 72%         |
|  AdminPort                                           |
|    allOf(hasRole, hasPerm)    |  Allow: 89%         |
|  ReportService                                       |
|    anyOf(hasRole, hasAttr)    |  Allow: 94%         |
+------------------------------------------------------+
```

Each entry shows:

- Port name (bold)
- Policy summary (truncated to 40 chars)
- Allow rate badge with color coding

## 4.7 Execution Selector

```
+--[ v Execution #847 ]-------------------------------+
|  #847  ● Allow  alice   14:32:01  0.15ms            |
|  #846  ○ Deny   bob     14:32:01  0.08ms            |
|  #845  ● Allow  charlie 14:31:59  1.20ms            |
|  #844  ● Allow  alice   14:31:58  0.14ms            |
+------------------------------------------------------+
```

Each entry shows:

- Execution number
- Decision badge (green/red)
- Subject ID
- Timestamp
- Duration

### "No Execution" Mode

When no execution is selected, the tree shows the static policy structure:

- All nodes in neutral color (no allow/deny)
- No timing labels
- Tooltip on each node describes what it checks
- Useful for understanding policy structure without runtime data

## 4.8 Playback Animation

The Play button animates the evaluation order through the tree:

1. **Start**: Root node highlights with glow effect
2. **Depth-first traversal**: Each node lights up in evaluation order
   - For `AllOf`: children evaluated left-to-right; stops at first deny
   - For `AnyOf`: children evaluated left-to-right; stops at first allow
   - For `Not`: child evaluates, then result is inverted at parent
3. **Short-circuit**: When a compound node short-circuits, skipped children flash briefly in gray
4. **Result propagation**: Final outcome propagates back up to root with a ripple effect
5. **Speed control**: 0.5x, 1x (default), 2x, 4x

### Playback Controls

| Control | Action                         |
| ------- | ------------------------------ |
| Play    | Start/resume animation         |
| Pause   | Freeze at current node         |
| Step    | Advance one node (depth-first) |
| Reset   | Return to start                |
| Speed   | Dropdown: 0.5x, 1x, 2x, 4x     |

## 4.9 Node Detail Panel

When a node is selected (click), the detail panel shows:

### Compound Node Detail

```
+-- AllOf (depth: 0) --+
| Kind: allOf          |
| Result: allow        |
| Field strategy:      |
|   intersection       |
| Duration: 0.15ms     |
| Children: 2          |
|   Evaluated: 2       |
|   Skipped: 0         |
| Visible fields:      |
|   name, email, dept  |
+----------------------+
```

### Leaf Node Detail

```
+-- HasPermission --------+
| Kind: hasPermission     |
| Result: allow           |
| Duration: 0.05ms        |
| Permission: user:read   |
| Subject has permission:  |
|   true                   |
| Subject permissions:     |
|   user:read              |
|   user:write             |
|   report:read            |
+--------------------------+
```

### HasAttribute Detail (with resolved value)

```
+-- HasAttribute ----------+
| Kind: hasAttribute       |
| Result: allow            |
| Duration: 3.8ms [async]  |
| Attribute: dept          |
| Matcher: eq("eng")       |
| Resolved value: "eng"    |
| Match: true              |
| Async: yes (resolver)    |
| Resolver time: 3.2ms     |
+---------------------------+
```

## 4.10 Interaction Summary

| Interaction     | Effect                                     |
| --------------- | ------------------------------------------ |
| Click node      | Select node, show detail panel             |
| Double-click    | Expand/collapse subtree                    |
| Hover node      | Tooltip with kind description and outcome  |
| Hover edge      | Highlight edge and connected nodes         |
| Mouse wheel     | Zoom (centered on cursor)                  |
| Click+drag bg   | Pan the viewport                           |
| Fit button      | Zoom/pan to show entire tree               |
| Keyboard arrows | Navigate between nodes (depth-first order) |
| Enter           | Select focused node (show detail)          |
| Escape          | Deselect node, close detail panel          |
| `+` / `-`       | Zoom in / out                              |

## 4.11 Edge Cases

| Case                             | Behavior                                                          |
| -------------------------------- | ----------------------------------------------------------------- |
| Single leaf policy (no tree)     | Renders single node centered, no edges                            |
| Very deep tree (> 10 levels)     | Auto-switch to left-right layout; collapse deep branches          |
| Very wide tree (> 30 leaves)     | Auto-switch to radial layout; minimap for navigation              |
| Not(Not(policy))                 | Show both Not nodes; tooltip explains double negation             |
| Labeled policy wrapping compound | Show label as node title, compound logic in children              |
| No executions available          | Static structure mode; message "Run an evaluation to see results" |
| Evaluation error                 | Error node with amber badge and error message in detail           |

## 4.12 Zoom and Pan

| Property | Value                                                     |
| -------- | --------------------------------------------------------- |
| Min zoom | 0.2x (20%)                                                |
| Max zoom | 4.0x (400%)                                               |
| Default  | Fit-to-content on first render                            |
| Minimap  | Shows when tree exceeds viewport; 120x80px corner overlay |

_Previous: [03-views-and-wireframes.md](03-views-and-wireframes.md) | Next: [05-decision-log.md](05-decision-log.md)_
