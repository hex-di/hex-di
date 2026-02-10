# 18 - Definition of Done

_Previous: [17 - Appendices](./07-appendices.md)_

---

This document defines all tests required for `@hex-di/devtools` to be considered complete. Each section maps to spec section(s) and specifies required unit tests, type-level tests, component tests, integration tests, and mutation testing guidance.

## Test File Convention

| Test Category     | File Pattern  | Location                                   |
| ----------------- | ------------- | ------------------------------------------ |
| Unit tests        | `*.test.ts`   | `integrations/devtools/tests/`             |
| Type-level tests  | `*.test-d.ts` | `integrations/devtools/tests/`             |
| Component tests   | `*.test.tsx`  | `integrations/devtools/tests/`             |
| Integration tests | `*.test.tsx`  | `integrations/devtools/tests/integration/` |

---

## DoD 1: Compile-Time Protocol (Spec Sections 4-5)

### Unit Tests -- `typed-protocol.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1   | `TypedLibraryInspector` instance is assignable to `LibraryInspector` at runtime    | unit |
| 2   | `createTypedLibraryInspectorPort` creates port with `"library-inspector"` category | unit |
| 3   | `TypedLibraryInspector` preserves snapshot type parameter through `getSnapshot()`  | unit |
| 4   | `isLibraryInspector` returns `true` for `TypedLibraryInspector` instances          | unit |
| 5   | `createTypedLibraryInspectorPort` creates frozen port token                        | unit |
| 6   | Port `__portName` matches the provided name                                        | unit |

### Type-Level Tests -- `typed-protocol.test-d.ts`

| #   | Test                                                                                 | Type |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1   | `ExtractLibraryInspectorPorts` extracts only `"library-inspector"` category ports    | type |
| 2   | `ExtractLibraryNames` produces correct string literal union from graph provides      | type |
| 3   | `LibrarySnapshotMap` maps library names to their typed snapshot interfaces           | type |
| 4   | `TypedUnifiedSnapshot` is assignable to base `UnifiedSnapshot`                       | type |
| 5   | Graph with no library-inspector ports produces empty map for `LibrarySnapshotMap`    | type |
| 6   | Mixed typed and untyped library inspectors both pass `isLibraryInspector` type guard | type |
| 7   | `TypedLibraryInspector<"flow", FlowSnapshot>` is assignable to `LibraryInspector`    | type |
| 8   | `createTypedLibraryInspectorPort` return type has correct generic parameters         | type |
| 9   | `ExtractLibraryInspectorPorts` returns `never` for non-library-inspector ports       | type |

### Mutation Testing

**Target: >95% mutation score.** The typed protocol is the compile-time foundation. Mutations to port category assignment, type guard checks, or snapshot type preservation must be caught. The `createTypedLibraryInspectorPort` factory must produce ports with the correct category string -- any mutation to `"library-inspector"` would break auto-discovery.

---

## DoD 2: Component Architecture (Spec Sections 6-7)

### Component Tests -- `devtools-shell.test.tsx`

| #   | Test                                                                            | Type      |
| --- | ------------------------------------------------------------------------------- | --------- |
| 1   | `HexDevTools` renders trigger button when panel is closed                       | component |
| 2   | `HexDevTools` renders panel shell when panel is open                            | component |
| 3   | Trigger button click toggles panel open/closed                                  | component |
| 4   | Keyboard shortcut (default `ctrl+shift+d`) toggles panel                        | component |
| 5   | Escape key closes panel when open                                               | component |
| 6   | `enabled={false}` renders nothing (null)                                        | component |
| 7   | Panel auto-detects inspector from `InspectorProvider` context when prop omitted | component |
| 8   | Panel uses explicit `inspector` prop when provided                              | component |
| 9   | Tab click switches active panel content                                         | component |
| 10  | Custom panels (via `panels` prop) appear in tab bar at correct position         | component |
| 11  | Library panels auto-discovered from `inspector.getLibraryInspectors()`          | component |
| 12  | Panel height persisted to localStorage on resize                                | component |
| 13  | Active tab persisted to localStorage on tab switch                              | component |
| 14  | Theme toggle switches between light and dark modes                              | component |
| 15  | System theme detection uses `prefers-color-scheme` media query                  | component |
| 16  | `defaultOpen={true}` renders panel open on initial mount                        | component |
| 17  | `defaultHeight` prop sets initial panel height                                  | component |
| 18  | `triggerPosition` prop positions trigger button correctly                       | component |
| 19  | Custom `hotkey` prop overrides default keyboard shortcut                        | component |
| 20  | Panel shell has `role="complementary"` ARIA attribute                           | component |
| 21  | Tab bar uses `role="tablist"` with `role="tab"` for each tab                    | component |
| 22  | Active panel content has `role="tabpanel"`                                      | component |

### Mutation Testing

**Target: >90% mutation score.** Component architecture involves React lifecycle, event handling, and localStorage persistence. Mutations to keyboard event key matching, localStorage read/write, and tab switching logic must be caught. The `enabled` prop guard is critical for production tree-shaking.

---

## DoD 3: Container Panel (Spec Section 8)

### Component Tests -- `container-panel.test.tsx`

| #   | Test                                                                           | Type      |
| --- | ------------------------------------------------------------------------------ | --------- |
| 1   | Container panel renders stat cards (total ports, resolved, singletons, scoped) | component |
| 2   | Stat cards update when inspector snapshot changes                              | component |
| 3   | Port table lists all registered ports with name, lifetime, and factory kind    | component |
| 4   | Port table search filters ports by name substring                              | component |
| 5   | Error rate badge appears for ports with high error rate                        | component |
| 6   | Click on port row expands detail view with adapter info                        | component |
| 7   | Result statistics section shows ok/err counts per port                         | component |
| 8   | Container phase indicator shows current phase (building, ready, disposed)      | component |

### Mutation Testing

**Target: >85% mutation score.** Container panel displays diagnostic data from inspector queries. Mutations to stat card value extraction, search filter logic, and error rate threshold comparisons must be caught.

---

## DoD 3b: Unified Overview Panel (Spec Section 13)

### Component Tests -- `overview-panel.test.tsx`

| #   | Test                                                                                  | Type      |
| --- | ------------------------------------------------------------------------------------- | --------- |
| 1   | Overview panel renders container stat cards (phase, ports, resolved, errors)          | component |
| 2   | Overview panel renders library summary cards for each registered library              | component |
| 3   | Headline metrics extracted correctly for known libraries (Flow, Tracing, Store, Saga) | component |
| 4   | Click on library card navigates to that library's panel tab                           | component |
| 5   | Click on container stat section navigates to Container panel                          | component |
| 6   | Panel updates reactively when unified snapshot changes                                | component |
| 7   | Unknown library fallback shows snapshot key count                                     | component |
| 8   | Empty state shown when no libraries are registered                                    | component |

### Mutation Testing

**Target: >85% mutation score.** Overview panel extracts headline metrics per library name. Mutations to the library name matching logic, metric field extraction, and navigation callbacks must be caught.

---

## DoD 3c: Health & Diagnostics Panel (Spec Section 14)

### Component Tests -- `health-panel.test.tsx`

| #   | Test                                                                    | Type      |
| --- | ----------------------------------------------------------------------- | --------- |
| 1   | Health panel renders complexity score and recommendation badge          | component |
| 2   | Blast radius dropdown lists all registered ports                        | component |
| 3   | Selecting a port in blast radius shows direct and transitive dependents | component |
| 4   | Captive dependency risks section displays detected captive pairs        | component |
| 5   | Captive dependency section shows "(none detected)" when empty           | component |
| 6   | Scope leak detection flags scopes older than threshold                  | component |
| 7   | Scope leak detection flags scopes with too many children                | component |
| 8   | Error hotspots section shows ports with high error rates                | component |
| 9   | Clicking port name navigates to Graph panel                             | component |
| 10  | Clicking scope ID navigates to Scope Tree panel                         | component |
| 11  | Suggestions list renders all graph suggestions with type badges         | component |
| 12  | Diagnostics debounced recalculation triggers on inspector events        | component |
| 13  | Refresh button forces immediate recalculation                           | component |

### Mutation Testing

**Target: >85% mutation score.** Health panel combines data from multiple sources. Mutations to threshold comparisons (error rate, scope age, children count), blast radius computation triggers, and cross-panel navigation callbacks must be caught.

---

## DoD 4: Graph Panel (Spec Section 9)

### Component Tests -- `graph-panel.test.tsx`

| #   | Test                                                                  | Type      |
| --- | --------------------------------------------------------------------- | --------- |
| 1   | Graph panel renders SVG with nodes for each adapter                   | component |
| 2   | Node colors differentiate by lifetime (singleton, scoped, transient)  | component |
| 3   | Click on node selects it and shows detail bar                         | component |
| 4   | Zoom in/out controls adjust SVG viewBox                               | component |
| 5   | Detail bar shows port name, lifetime, dependencies, and dependents    | component |
| 6   | Edges connect dependency ports with directional arrows                | component |
| 7   | Inherited adapters have distinct visual styling (dashed border)       | component |
| 8   | Overridden adapters have distinct visual styling (highlighted border) | component |
| 9   | Analysis sidebar renders complexity gauge with score                  | component |
| 10  | Analysis sidebar renders suggestion cards with type badges            | component |
| 11  | Clicking a suggestion card selects the corresponding graph node       | component |
| 12  | Analysis sidebar shows captive dependency pairs                       | component |
| 13  | Port filtering dropdowns filter both sidebar lists and graph nodes    | component |
| 14  | Export DOT button copies GraphViz DOT string to clipboard             | component |

### Mutation Testing

**Target: >80% mutation score.** Graph visualization involves coordinate calculations and SVG rendering. Lower target reflects the visual nature of the output, but node color assignment by lifetime, edge connection logic, analysis sidebar data extraction, and DOT export delegation must be verified.

---

## DoD 5: Scope Tree Panel (Spec Section 10)

### Component Tests -- `scope-tree-panel.test.tsx`

| #   | Test                                                                 | Type      |
| --- | -------------------------------------------------------------------- | --------- |
| 1   | Scope tree panel renders root container node                         | component |
| 2   | Child containers render as nested tree nodes                         | component |
| 3   | Click on tree node expands/collapses children                        | component |
| 4   | Active scopes have visual indicator (solid dot)                      | component |
| 5   | Disposed scopes have visual indicator (hollow dot, greyed)           | component |
| 6   | Click on scope node shows detail view with scope metadata            | component |
| 7   | Lazy containers shown with distinct icon/label                       | component |
| 8   | Scope tree updates reactively on scope-created/scope-disposed events | component |

### Mutation Testing

**Target: >85% mutation score.** Scope tree rendering involves recursive tree traversal and reactive updates. Active/disposed indicator logic and expand/collapse state management must be verified.

---

## DoD 6: Tracing Panel (Spec Section 11)

### Component Tests -- `tracing-panel.test.tsx`

| #   | Test                                                                  | Type      |
| --- | --------------------------------------------------------------------- | --------- |
| 1   | Tracing panel renders timeline with span bars                         | component |
| 2   | Span bar width proportional to duration                               | component |
| 3   | Click on span bar selects it and shows detail view                    | component |
| 4   | Filter input filters spans by port name                               | component |
| 5   | Error spans highlighted with error color                              | component |
| 6   | Nested spans (parent-child) indented in timeline                      | component |
| 7   | Summary statistics (total spans, avg duration, error count) displayed | component |
| 8   | Empty state shown when no tracing data available                      | component |

### Mutation Testing

**Target: >80% mutation score.** Tracing panel involves timeline calculations and span rendering. Lower target reflects the visual nature, but span duration-to-width calculation, error color assignment, and filter logic must be caught.

---

## DoD 7: Library Panels (Spec Sections 12.1-12.2)

### Component Tests -- `library-panels.test.tsx`

| #   | Test                                                                       | Type      |
| --- | -------------------------------------------------------------------------- | --------- |
| 1   | Auto-discovered library panels appear in tab bar                           | component |
| 2   | Default library panel renders tree view of library snapshot                | component |
| 3   | Tree view expands/collapses nested snapshot properties                     | component |
| 4   | Custom panel component (from library) renders instead of default tree view | component |
| 5   | Library panel refreshes when library inspector emits events                | component |
| 6   | Library panel shows library name in tab label                              | component |

### Mutation Testing

**Target: >85% mutation score.** Auto-discovery logic (iterating library inspectors, generating panel entries) and tree view rendering of dynamic snapshot shapes must be verified.

---

## DoD 8: Event Log Panel (Spec Sections 12.3-12.4)

### Component Tests -- `event-log-panel.test.tsx`

| #   | Test                                                              | Type      |
| --- | ----------------------------------------------------------------- | --------- |
| 1   | Event log panel displays events in chronological order            | component |
| 2   | Ring buffer evicts oldest events when capacity exceeded           | component |
| 3   | Filter dropdown filters events by type                            | component |
| 4   | Search input filters events by text content                       | component |
| 5   | Auto-scroll follows new events when scrolled to bottom            | component |
| 6   | Auto-scroll pauses when user scrolls up                           | component |
| 7   | Pause/resume button stops and resumes event collection            | component |
| 8   | Clear button empties the event log                                | component |
| 9   | Event entries show timestamp, type, source, and truncated payload | component |
| 10  | Click on event entry expands full payload view                    | component |

### Mutation Testing

**Target: >85% mutation score.** Ring buffer eviction logic, auto-scroll behavior (detecting bottom position), and filter/search predicate logic must be caught. The pause/resume toggle is a critical boolean guard.

---

## DoD 9: Visual Design & Accessibility (Spec Sections 16-18)

### Component Tests -- `visual-design.test.tsx`

| #   | Test                                                                      | Type      |
| --- | ------------------------------------------------------------------------- | --------- |
| 1   | All theme tokens are applied as CSS custom properties on the root element | component |
| 2   | Dark theme applies correct color values                                   | component |
| 3   | Light theme applies correct color values                                  | component |
| 4   | CSS scoping: all styles contained within `[data-hex-devtools]`            | component |
| 5   | Resize handle responds to pointer drag and updates panel height           | component |
| 6   | Panel respects `prefers-reduced-motion` by disabling animations           | component |
| 7   | Focus trap keeps keyboard focus within panel when open                    | component |
| 8   | Trigger button is keyboard-focusable and activatable with Enter/Space     | component |

### Mutation Testing

**Target: >80% mutation score.** Visual design tests involve CSS property assertions and pointer event handling. Lower target reflects the difficulty of catching purely visual mutations, but focus trap logic, keyboard activation, and reduced motion detection must be verified.

---

## Test Count Summary

| Category          | Count    |
| ----------------- | -------- |
| Unit tests        | ~6       |
| Type-level tests  | ~9       |
| Component tests   | ~105     |
| Integration tests | ~0\*     |
| **Total**         | **~120** |

\* Integration tests will be added as the package integrates with `@hex-di/react` providers. The primary testing mode for a UI package is component testing with mocked `InspectorAPI` instances.

Component test breakdown: Shell (22) + Container (8) + Overview (8) + Health (13) + Graph (14) + Scope Tree (8) + Tracing (8) + Library (6) + Event Log (10) + Visual Design (8) = 105 component tests + 6 unit + 9 type-level = 120 total.

---

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                             | Command                                                                       | Expected   |
| --------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| All unit tests pass               | `pnpm --filter @hex-di/devtools test`                                         | 0 failures |
| All type tests pass               | `pnpm --filter @hex-di/devtools test:types`                                   | 0 failures |
| All component tests pass          | `pnpm --filter @hex-di/devtools test`                                         | 0 failures |
| Typecheck passes                  | `pnpm --filter @hex-di/devtools typecheck`                                    | 0 errors   |
| Lint passes                       | `pnpm --filter @hex-di/devtools lint`                                         | 0 errors   |
| No `any` types in source          | `grep -r "any" integrations/devtools/src/`                                    | 0 matches  |
| No type casts in source           | `grep -r " as " integrations/devtools/src/`                                   | 0 matches  |
| No eslint-disable in source       | `grep -r "eslint-disable" integrations/devtools/src/`                         | 0 matches  |
| Mutation score (protocol)         | `pnpm --filter @hex-di/devtools stryker -- --mutate src/protocol/**`          | >95%       |
| Mutation score (shell)            | `pnpm --filter @hex-di/devtools stryker -- --mutate src/components/shell/**`  | >90%       |
| Mutation score (container panel)  | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/container/**`  | >85%       |
| Mutation score (overview panel)   | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/overview/**`   | >85%       |
| Mutation score (health panel)     | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/health/**`     | >85%       |
| Mutation score (graph panel)      | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/graph/**`      | >80%       |
| Mutation score (scope tree panel) | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/scope-tree/**` | >85%       |
| Mutation score (tracing panel)    | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/tracing/**`    | >80%       |
| Mutation score (library panels)   | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/library/**`    | >85%       |
| Mutation score (event log)        | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/event-log/**`  | >85%       |
| Mutation score (visual design)    | `pnpm --filter @hex-di/devtools stryker -- --mutate src/theme/**`             | >80%       |

---

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/devtools

DevTools components have behavioral invariants that standard coverage cannot verify:

- **Panel toggle logic** -- mutating the open/closed boolean or keyboard event key matching silently breaks the toggle without failing render tests
- **Tab switching** -- swapping tab IDs or removing the active tab guard causes the wrong panel to render
- **localStorage persistence** -- removing a `setItem` call means state is lost on refresh; removing a `getItem` call means defaults always override persisted preferences
- **Ring buffer eviction** -- mutating the eviction condition (full check, index wrap) causes either unbounded memory growth or lost events
- **Auto-scroll detection** -- mutating the "at bottom" threshold causes auto-scroll to either never engage or never disengage
- **Theme token assignment** -- swapping CSS variable names causes incorrect colors without breaking any functional test
- **Filter predicates** -- inverting a filter condition shows excluded items and hides included items
- **Auto-discovery iteration** -- skipping the library inspector map iteration produces an empty library panel list

### Mutation Targets by Priority

| Priority | Module                                         | Target Score | Rationale                                                                                       |
| -------- | ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| Critical | Typed protocol (`protocol/`)                   | >95%         | Foundation: wrong category or type guard = broken auto-discovery.                               |
| Critical | Shell & state management (`components/shell/`) | >90%         | Toggle, tab switching, keyboard shortcuts, localStorage persistence.                            |
| High     | Container panel (`panels/container/`)          | >85%         | Stat card extraction, search filter, error rate threshold.                                      |
| High     | Overview panel (`panels/overview/`)            | >85%         | Headline metric extraction per library, navigation callbacks, reactive updates.                 |
| High     | Health panel (`panels/health/`)                | >85%         | Threshold comparisons, blast radius computation, scope leak heuristics, cross-panel navigation. |
| High     | Scope tree panel (`panels/scope-tree/`)        | >85%         | Recursive tree rendering, active/disposed indicators, expand/collapse.                          |
| High     | Library panels (`panels/library/`)             | >85%         | Auto-discovery, tree view rendering of dynamic snapshot shapes.                                 |
| High     | Event log panel (`panels/event-log/`)          | >85%         | Ring buffer, auto-scroll, pause/resume, filter/search.                                          |
| Medium   | Graph panel (`panels/graph/`)                  | >80%         | SVG rendering, coordinate math, zoom transforms. Visual output is harder to assert precisely.   |
| Medium   | Tracing panel (`panels/tracing/`)              | >80%         | Timeline rendering, span-to-width calculations. Visual output.                                  |
| Medium   | Theme & accessibility (`theme/`)               | >80%         | CSS variable assignment, focus trap, keyboard nav. Partially visual.                            |

### Mutation Operators to Prioritize

- **Boolean mutations**: `true` -> `false` in `isOpen`, `enabled`, `isPaused` (catches toggle and guard logic)
- **String literal mutations**: `"container"` -> `"graph"` in default tab (catches tab identity confusion)
- **Conditional boundary mutations**: `>=` -> `>` in scroll position check, ring buffer full check (catches off-by-one in auto-scroll and eviction)
- **Block removal**: Removing `localStorage.setItem(...)` calls (catches persistence loss)
- **Method call mutations**: `inspector.getLibraryInspectors()` -> skip (catches missing auto-discovery)
- **Return value mutations**: Returning empty array instead of filtered panels (catches filter logic removal)
- **Arithmetic mutations**: Duration-to-width ratio calculations in tracing timeline (catches span rendering errors)

### Stryker Configuration

```json
{
  "mutate": [
    "integrations/devtools/src/**/*.ts",
    "integrations/devtools/src/**/*.tsx",
    "!integrations/devtools/src/**/*.test.*"
  ],
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 85,
    "low": 75,
    "break": 75
  },
  "timeoutMS": 60000,
  "timeoutFactor": 2.5,
  "concurrency": 4
}
```

Thresholds are set lower than core packages (which use `90/80/80`) because DevTools is a UI package where some mutations produce visually different but functionally acceptable output (e.g., a slightly different shade of grey). The `break` threshold at 75% ensures that critical behavioral logic (toggle, persistence, auto-discovery) is always verified.

---

_Previous: [17 - Appendices](./07-appendices.md)_

_End of Definition of Done_
