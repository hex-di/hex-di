# Guard Panel Specification

Comprehensive specification for the Guard Panel in `@hex-di/devtools-ui`.

The Guard Panel provides visual, interactive inspection of authorization decisions flowing through a hex-di container. It combines policy tree visualization, aggregate access flow statistics, an interactive decision log, and educational features to make authorization visible, understandable, and debuggable.

## Document Map

| File                                                         | Section                   | Purpose                                                                |
| ------------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------- |
| [01-overview.md](01-overview.md)                             | Overview & Data Models    | Motivation, goals, core TypeScript interfaces (14 types)               |
| [02-instrumentation.md](02-instrumentation.md)               | Instrumentation Layer     | Per-evaluation tracing, GuardInspector stats, opt-in deep tracing      |
| [03-views-and-wireframes.md](03-views-and-wireframes.md)     | Views & Wireframes        | 7 views with ASCII wireframes and component trees                      |
| [04-policy-evaluation-tree.md](04-policy-evaluation-tree.md) | Policy Evaluation Tree    | Tree visualization of compound policy evaluation with allow/deny nodes |
| [05-decision-log.md](05-decision-log.md)                     | Decision Log View         | Chronological allow/deny/error log with subject and trace details      |
| [06-policy-path-explorer.md](06-policy-path-explorer.md)     | Policy Path Explorer View | All possible evaluation paths through compound policies                |
| [07-access-flow-statistics.md](07-access-flow-statistics.md) | Access Flow Statistics    | Sankey-style subjects-to-decisions flow, hotspot detection             |
| [08-evaluation-timeline.md](08-evaluation-timeline.md)       | Evaluation Timeline View  | Temporal evaluation view, async resolver timing                        |
| [09-role-hierarchy-graph.md](09-role-hierarchy-graph.md)     | Role Hierarchy Graph View | DAG visualization of role inheritance and permission flattening        |
| [10-visual-encoding.md](10-visual-encoding.md)               | Visual Encoding           | Colors, shapes, icons, animations, CSS variables, responsive behavior  |
| [11-interactions.md](11-interactions.md)                     | Interactions & Navigation | Mouse, keyboard, cross-panel, real-time updates                        |
| [12-educational-features.md](12-educational-features.md)     | Educational Features      | Policy type explanations, RBAC/ABAC/ReBAC tutorials, what-if sim       |
| [13-filter-and-search.md](13-filter-and-search.md)           | Filter & Search System    | Filtering by port, subject, role, decision, policy kind, time range    |
| [14-integration.md](14-integration.md)                       | Integration               | Panel registration, data hooks, playground, export, performance        |
| [15-accessibility.md](15-accessibility.md)                   | Accessibility             | ARIA, keyboard, screen readers, motion preferences                     |
| [16-definition-of-done.md](16-definition-of-done.md)         | Definition of Done        | ~350 tests, mutation testing, acceptance criteria                      |

## Design Principles

1. **Policy tree as primary mental model** -- Compound policies are trees (AllOf/AnyOf/Not compose). Every visualization reinforces the tree structure with allow/deny outcomes at each node.
2. **Static + runtime fusion** -- Show the policy structure (what _could_ evaluate) alongside observed decisions (what _did_ happen).
3. **Progressive disclosure** -- Overview dashboard first, drill into decision details and policy trees on demand. Never overwhelm.
4. **Educational by default** -- Every policy kind has an explanation. Users learn RBAC/ABAC/ReBAC patterns through exploration.
5. **Zero-config for basics** -- GuardInspector stats work without code changes. Deep tree tracing requires opt-in.
6. **Audit-oriented** -- Decision logs emphasize accountability: who, what, when, why, outcome.
