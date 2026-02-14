# Graph Panel -- Detailed Specification

**Module**: `@hex-di/devtools-ui` (built-in panel)
**Parent Spec**: [04-panels.md, Section 9](../../devtools/04-panels.md#section-9-graph-panel)
**Availability**: Always available. Derived from `InspectorDataSource.getGraphData()`.

The Graph Panel renders an interactive dependency graph visualization for one or more containers. It supersedes Section 9 of 04-panels.md with comprehensive multi-container support, library-specific adapter differentiation, metadata inspection, filtering, and graph analysis.

---

## Table of Contents

| #   | File                                                 | Sections | Description                                                            |
| --- | ---------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| 01  | [Overview and Data Model](01-overview.md)            | 1, 2     | Purpose, motivation, and all TypeScript data model interfaces          |
| 02  | [Layout and Wireframes](02-layout-and-wireframes.md) | 3, 4     | ASCII wireframes for all views and the component tree                  |
| 03  | [Interactions](03-interactions.md)                   | 5        | Node selection, pan/zoom, drag, filter, keyboard, context menu         |
| 04  | [Visual Encoding](04-visual-encoding.md)             | 6, 15    | Node shapes, colors, borders, badges, edge styles, and styling tokens  |
| 05  | [Container Hierarchy](05-container-hierarchy.md)     | 7        | Multi-container display, inheritance, override chains, comparison mode |
| 06  | [Metadata and Detail](06-metadata-and-detail.md)     | 8        | Metadata inspector panel sections                                      |
| 07  | [Filter System](07-filter-system.md)                 | 9        | Filter and search controls, presets, compound mode                     |
| 08  | [Analysis Sidebar](08-analysis-sidebar.md)           | 10       | Complexity score, suggestions, captive dependencies, orphan ports      |
| 09  | [Panels Integration](09-panels-integration.md)       | 11-14    | Real-time updates, cross-panel navigation, export, performance         |
| 10  | [Accessibility](10-accessibility.md)                 | 16, 17   | ARIA roles, keyboard, screen reader, color independence, edge states   |
| 11  | [Definition of Done](11-definition-of-done.md)       | 18       | All test tables, mutation testing strategy, verification checklist     |
