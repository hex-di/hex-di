_Previous: [09-role-hierarchy-graph.md](09-role-hierarchy-graph.md) | Next: [11-interactions.md](11-interactions.md)_

# 10. Visual Encoding

All colors, shapes, icons, animations, and CSS custom properties used across Guard Panel views.

## 10.1 CSS Custom Properties

The Guard Panel introduces the following CSS custom properties, extending the existing `--hex-*` design token system:

### Decision Colors

| Property                  | Light                     | Dark                      | Usage                                  |
| ------------------------- | ------------------------- | ------------------------- | -------------------------------------- |
| `--hex-guard-allow`       | `#059669` (emerald-600)   | `#34d399` (emerald-400)   | Allow badges, tree node borders, edges |
| `--hex-guard-deny`        | `#e11d48` (rose-600)      | `#fb7185` (rose-400)      | Deny badges, tree node borders, edges  |
| `--hex-guard-allow-muted` | `#059669` at 15%          | `#34d399` at 20%          | Allow background tint                  |
| `--hex-guard-deny-muted`  | `#e11d48` at 15%          | `#fb7185` at 20%          | Deny background tint                   |
| `--hex-guard-error`       | `#d97706` (amber-600)     | `#fbbf24` (amber-400)     | Error badges, timeout indicators       |
| `--hex-guard-error-muted` | `#d97706` at 15%          | `#fbbf24` at 20%          | Error background tint                  |
| `--hex-guard-skip`        | `--hex-text-muted` at 40% | `--hex-text-muted` at 40% | Skipped/short-circuited nodes          |

### Policy Kind Colors

| Property                     | Light               | Dark      | Policy Kind                 |
| ---------------------------- | ------------------- | --------- | --------------------------- |
| `--hex-kind-hasPermission`   | `#6366f1` (indigo)  | `#818cf8` | HasPermission (RBAC)        |
| `--hex-kind-hasRole`         | `#8b5cf6` (violet)  | `#a78bfa` | HasRole (RBAC)              |
| `--hex-kind-hasAttribute`    | `#3b82f6` (blue)    | `#60a5fa` | HasAttribute (ABAC)         |
| `--hex-kind-hasResourceAttr` | `#0891b2` (cyan)    | `#22d3ee` | HasResourceAttribute (ABAC) |
| `--hex-kind-hasSignature`    | `#059669` (emerald) | `#34d399` | HasSignature (Compliance)   |
| `--hex-kind-hasRelationship` | `#d946ef` (fuchsia) | `#e879f9` | HasRelationship (ReBAC)     |
| `--hex-kind-allOf`           | `#f59e0b` (amber)   | `#fbbf24` | AllOf (compound AND)        |
| `--hex-kind-anyOf`           | `#f97316` (orange)  | `#fb923c` | AnyOf (compound OR)         |
| `--hex-kind-not`             | `#ef4444` (red)     | `#f87171` | Not (negation)              |
| `--hex-kind-labeled`         | `#6b7280` (gray)    | `#9ca3af` | Labeled (wrapper)           |

### Severity Colors

| Property        | Light                   | Dark                    | Usage                            |
| --------------- | ----------------------- | ----------------------- | -------------------------------- |
| `--hex-warning` | `#d97706` (amber-600)   | `#fbbf24` (amber-400)   | Slow evaluations, cycle warnings |
| `--hex-error`   | `#dc2626` (red-600)     | `#f87171` (red-400)     | Timeout, circular inheritance    |
| `--hex-success` | `#059669` (emerald-600) | `#34d399` (emerald-400) | Allow rate > 95%, healthy status |

### UI Colors

| Property                   | Light                     | Dark                      | Usage                              |
| -------------------------- | ------------------------- | ------------------------- | ---------------------------------- |
| `--hex-guard-async`        | `#3b82f6` (blue-500)      | `#60a5fa` (blue-400)      | Async resolver bars in timeline    |
| `--hex-guard-sync`         | `--hex-text`              | `--hex-text`              | Sync evaluation bars               |
| `--hex-guard-shortcircuit` | `--hex-text-muted` at 30% | `--hex-text-muted` at 30% | Short-circuit indicators           |
| `--hex-guard-timeline-bg`  | `#f1f5f9` (slate-100)     | `#1e293b` (slate-800)     | Timeline background                |
| `--hex-guard-role-edge`    | `--hex-text-muted` at 60% | `--hex-text-muted` at 60% | Role hierarchy edges               |
| `--hex-guard-cycle`        | `#dc2626` (red-600)       | `#f87171` (red-400)       | Circular inheritance edges/borders |

## 10.2 Policy Kind Icons

Each policy kind has a distinctive icon rendered as an inline SVG:

| Policy Kind          | Icon                | Description                |
| -------------------- | ------------------- | -------------------------- |
| hasPermission        | `🔑` (key)          | Permission check           |
| hasRole              | `👤` (person)       | Role membership            |
| hasAttribute         | `📋` (clipboard)    | Subject attribute match    |
| hasResourceAttribute | `📦` (package)      | Resource attribute match   |
| hasSignature         | `✍` (writing hand)  | Electronic signature check |
| hasRelationship      | `🔗` (link)         | Relationship traversal     |
| allOf                | `⊗` (circled times) | AND -- all must pass       |
| anyOf                | `⊕` (circled plus)  | OR -- any must pass        |
| not                  | `⊘` (circled slash) | Negation                   |
| labeled              | `🏷` (label)        | Named wrapper              |

Icons are 14x14px SVG elements, colored with the policy kind's CSS property.

## 10.3 Decision Badges

Inline badges used across all views to indicate evaluation outcome:

| Badge | Display   | Background                | Text                |
| ----- | --------- | ------------------------- | ------------------- |
| Allow | `● Allow` | `--hex-guard-allow-muted` | `--hex-guard-allow` |
| Deny  | `○ Deny`  | `--hex-guard-deny-muted`  | `--hex-guard-deny`  |
| Error | `◆ Error` | `--hex-guard-error-muted` | `--hex-guard-error` |
| Skip  | `◌ Skip`  | `--hex-guard-skip`        | `--hex-text-muted`  |

Badge dimensions: `height: 20px`, `padding: 2px 8px`, `border-radius: 10px`, `font-size: 11px`, `font-weight: 600`.

## 10.4 Tree Node Shapes

### Compound Nodes

| Property       | Value                         |
| -------------- | ----------------------------- |
| Shape          | Rounded rectangle             |
| Border radius  | 8px                           |
| Border width   | 2px (default), 3px (selected) |
| Min width      | 120px                         |
| Min height     | 64px                          |
| Shadow         | `0 1px 3px rgba(0,0,0,0.1)`   |
| Shadow (hover) | `0 4px 12px rgba(0,0,0,0.15)` |

### Leaf Nodes

| Property      | Value                         |
| ------------- | ----------------------------- |
| Shape         | Rounded rectangle             |
| Border radius | 8px                           |
| Border width  | 2px (default), 3px (selected) |
| Min width     | 120px                         |
| Min height    | 64px                          |
| Left accent   | 4px bar in policy kind color  |

### Role Graph Nodes

| Property      | Value                            |
| ------------- | -------------------------------- |
| Shape         | Rounded rectangle                |
| Border radius | 8px                              |
| Border width  | 2px                              |
| Width         | 160px                            |
| Height        | 80px (compact), 120px (expanded) |
| Shadow        | `0 1px 3px rgba(0,0,0,0.1)`      |

## 10.5 Short-Circuit Indicator

The short-circuit indicator used in the Policy Evaluation Tree:

```
◌ (open circle, dashed)
```

- Size: 16x16px
- Fill: `--hex-guard-skip`
- Border: 1px dashed
- Positioned inside skipped nodes
- Tooltip: "This node was short-circuited and not evaluated"

## 10.6 Async Resolution Indicator

Used in the Evaluation Timeline and Policy Evaluation Tree:

```
⟳ (async spinner)
```

- Size: 14x14px
- Fill: `--hex-guard-async` (blue)
- Animated: 1s spin during live resolution
- Static after resolution completes
- Label: "[async]" appended to duration

## 10.7 Animation Specifications

### Tree Playback

| Animation                          | Duration | Easing                                  |
| ---------------------------------- | -------- | --------------------------------------- |
| Node highlight (evaluation order)  | 300ms    | ease-in-out                             |
| Edge flow (parent to child)        | 200ms    | linear                                  |
| Result propagation (child to root) | 150ms    | ease-out                                |
| Skip flash (short-circuited node)  | 100ms    | ease-out (opacity 0 -> 0.3 -> 0)        |
| Decision burst (final outcome)     | 400ms    | ease-out (scale 1 -> 1.2 -> 1, opacity) |

### View Transitions

| Transition                           | Duration | Easing                          |
| ------------------------------------ | -------- | ------------------------------- |
| View switch                          | 200ms    | ease-in-out (opacity crossfade) |
| Panel slide-in (detail, educational) | 250ms    | ease-out (translateX)           |
| Panel slide-out                      | 200ms    | ease-in (translateX)            |
| Node expand/collapse                 | 200ms    | ease-in-out (height + opacity)  |
| Filter result transition             | 150ms    | ease-out (opacity)              |

### Log Entry Animations

| Animation              | Duration | Easing                          |
| ---------------------- | -------- | ------------------------------- |
| New entry slide-in     | 200ms    | ease-out (translateY + opacity) |
| "New" badge pulse      | 2000ms   | linear (2 cycles then fade)     |
| Badge color transition | 150ms    | ease-in-out                     |

### Sankey Flow Animation

| Animation                | Duration | Easing                        |
| ------------------------ | -------- | ----------------------------- |
| Link width transition    | 300ms    | ease-in-out                   |
| Node highlight on hover  | 150ms    | ease-out (opacity)            |
| Filter change transition | 400ms    | ease-in-out (width + opacity) |

## 10.8 Duration Formatting

| Range           | Format    | Example   |
| --------------- | --------- | --------- |
| < 0.01ms        | `<0.01ms` | `<0.01ms` |
| 0.01ms - 0.99ms | `N.NNms`  | `0.15ms`  |
| 1ms - 999ms     | `Nms`     | `4ms`     |
| 1s - 59s        | `N.Ns`    | `1.2s`    |
| >= 60s          | `Nm Ns`   | `1m 12s`  |

## 10.9 Responsive Behavior

| Width Range | Layout Adaptation                                                        |
| ----------- | ------------------------------------------------------------------------ |
| >= 1200px   | Full layout: view area + detail panel side-by-side                       |
| 800-1199px  | Detail panel overlays (slides over view, not beside it)                  |
| 600-799px   | Compact toolbar (icons only, no labels); detail panel full-width overlay |
| < 600px     | Single-column; views stack; simplified tree rendering (list mode)        |

### Compact Mode (< 800px)

In compact mode:

- Policy tree switches from graphical to indented list view
- Role graph switches to collapsible tree list
- Sankey diagram switches to stacked bar chart
- Timeline switches to simplified single-bar per node

## 10.10 Theme Support

The Guard Panel inherits the DevTools theme system:

| Theme         | Description                                          |
| ------------- | ---------------------------------------------------- |
| Light         | White backgrounds, dark text, lighter accent colors  |
| Dark          | Dark backgrounds, light text, brighter accent colors |
| System        | Follows OS preference via `prefers-color-scheme`     |
| High contrast | Increased border widths, no transparency, bold text  |

All colors defined in [Section 10.1](#101-css-custom-properties) have light and dark variants. The high-contrast theme replaces muted backgrounds with solid colors and increases border widths to 3px.

_Previous: [09-role-hierarchy-graph.md](09-role-hierarchy-graph.md) | Next: [11-interactions.md](11-interactions.md)_
