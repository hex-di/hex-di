# Dead Code Analysis Report - @hex-di/devtools

**Generated**: 2026-01-12
**Tool**: knip v4.x
**Package**: @hex-di/devtools

---

## Executive Summary

Knip identified **13 unused files** and **232 unused exports** in the devtools package. This analysis categorizes the dead code, explains why it exists, why it's not being used, and identifies opportunities for cleanup or reactivation.

---

## Table of Contents

1. [Unused Files Analysis](#1-unused-files-analysis)
2. [Unused Exports by Category](#2-unused-exports-by-category)
3. [Root Cause Analysis](#3-root-cause-analysis)
4. [Recommendations](#4-recommendations)
5. [Action Items](#5-action-items)

---

## 1. Unused Files Analysis

### 1.1 Index Re-export Files (5 files) - **BARREL FILES**

| File                            | Lines | Status          |
| ------------------------------- | ----- | --------------- |
| `src/react/components/index.ts` | 16    | Orphaned barrel |
| `src/react/context/index.ts`    | 12    | Orphaned barrel |
| `src/react/providers/index.ts`  | 16    | Orphaned barrel |
| `src/react/types/index.ts`      | 10    | Orphaned barrel |
| `src/react/utils/index.ts`      | 19    | Orphaned barrel |

**Why They Exist**: These are barrel (index.ts) files created to provide clean import paths for submodules:

```typescript
// Intended usage:
import { FilterChip } from "@hex-di/devtools/react/components";
```

**Why Not Used**: The main `src/react/index.ts` imports directly from the source files, not through these barrels:

```typescript
// Actual usage in src/react/index.ts:
export { FilterChip } from "./components/filter-chips.js"; // Direct import
// NOT: export { FilterChip } from "./components/index.js"; // Through barrel
```

**Opportunity**:

- **Option A**: Delete these files - they add no value if not used
- **Option B**: Update `src/react/index.ts` to import through barrels for consistency
- **Recommendation**: Delete (Option A) - direct imports are faster and these barrels are just indirection

---

### 1.2 DI Integration Files (2 files) - **ARCHITECTURAL EXPLORATION**

| File                                           | Lines | Purpose                    |
| ---------------------------------------------- | ----- | -------------------------- |
| `src/di/devtools-graph.ts`                     | 161   | DI graph for flow services |
| `src/runtime/devtools-flow-runtime-adapter.ts` | 148   | DI adapter for runtime     |

**Why They Exist**: These files represent an **abandoned architectural approach** to integrate DevTools with the DI system:

```typescript
// devtools-graph.ts - Creates ports and adapters for DI resolution
export const UIFlowPort = createFlowPort<...>("UIFlow");
export const ContainerTreeFlowAdapter = createFlowAdapter({...});
export function createDevToolsGraph(): Graph<...> {...}

// devtools-flow-runtime-adapter.ts - Adapter that always throws
export function createDevToolsFlowRuntimeAdapter() {
  // THROWS: "Use createDevToolsFlowRuntime({ container }) instead."
}
```

**Why Not Used**: The DI adapter pattern was **technically infeasible** because:

1. The DevToolsFlowRuntime needs access to the container at creation time
2. The container is not available in the adapter factory context
3. The `DevToolsProvider` creates the runtime directly, bypassing DI

**Opportunity**:

- These files document a dead end in the architecture
- The `devtools-flow-runtime-adapter.ts` explicitly documents this limitation
- **Recommendation**: Delete both files - they represent abandoned exploration

---

### 1.3 Shared Plugin Module (1 file) - **PREMATURE ABSTRACTION**

| File                          | Lines | Purpose                      |
| ----------------------------- | ----- | ---------------------------- |
| `src/plugins/shared/index.ts` | 13    | Re-exports shared components |

**Why It Exists**: Created to share `ContainerScopeHierarchy` between plugins.

**Why Not Used**:

- Only exports one component
- That component is imported directly from its source file instead
- The "shared" abstraction was premature

**Opportunity**: Delete - the single export doesn't justify a separate module

---

### 1.4 Type Test Files (5 files) - **FALSE POSITIVES**

| File                                         | Purpose          |
| -------------------------------------------- | ---------------- |
| `tests/graph-type-extensions.test-d.ts`      | Type-level tests |
| `tests/runtime-architecture-types.test-d.ts` | Type-level tests |
| `tests/runtime/plugin-types.test-d.ts`       | Type-level tests |
| `tests/runtime/types.test-d.ts`              | Type-level tests |
| `tests/types.test-d.ts`                      | Type-level tests |

**Why Flagged**: Knip doesn't recognize `.test-d.ts` files as being "used" because they:

- Don't export anything consumed by production code
- Are only imported by the type-checker

**Status**: **FALSE POSITIVE** - These files ARE used by `vitest --typecheck`

**Recommendation**: Keep - add to knip ignore configuration

---

## 2. Unused Exports by Category

### 2.1 Graph Utilities (5 exports) - **OVER-ENGINEERING**

| Export                       | File                         | Purpose               |
| ---------------------------- | ---------------------------- | --------------------- |
| `filterSelectedContainers`   | `plugins/graph/utils.ts:119` | Filter containers     |
| `createEmptyGraph`           | `plugins/graph/utils.ts:131` | Create empty graph    |
| `mergeGraphs`                | `plugins/graph/utils.ts:147` | Merge multiple graphs |
| `transformNodesToGraphNodes` | `plugins/index.ts:84`        | Transform nodes       |
| `isEmptyGraph`               | `plugins/index.ts:85`        | Check if empty        |

**Why They Exist**: Utility functions for graph manipulation, exported for potential external use.

**Why Not Used**:

- The plugin components use `deriveGraphFromSnapshot()` instead
- These lower-level utilities were superseded by higher-level abstractions

**Opportunity**:

- **If used internally**: Keep but remove from public exports
- **If truly unused**: Delete the functions
- **Recommendation**: Audit usage with grep, likely safe to delete re-exports

---

### 2.2 Plugin Content Components (4 exports) - **INTERNAL COMPONENTS**

| Export                   | Re-exported From      |
| ------------------------ | --------------------- |
| `GraphPluginContent`     | `plugins/index.ts:74` |
| `ServicesPluginContent`  | `plugins/index.ts:75` |
| `TracingPluginContent`   | `plugins/index.ts:76` |
| `InspectorPluginContent` | `plugins/index.ts:77` |

**Why They Exist**: Internal plugin content components re-exported for potential testing/extension.

**Why Not Used**: Consumers use the plugin factories (`GraphPlugin()`) not the raw content components.

**Recommendation**: Remove from public exports - these are implementation details

---

### 2.3 DI Rendering Props (4 exports) - **UNUSED RENDER PROP PATTERN**

| Export              | File                                         |
| ------------------- | -------------------------------------------- |
| `extractDIMetadata` | `graph-visualization/di-render-props.tsx:17` |
| `renderDINode`      | `graph-visualization/di-render-props.tsx:20` |
| `renderDITooltip`   | `graph-visualization/di-render-props.tsx:21` |
| `renderDIEdge`      | `graph-visualization/di-render-props.tsx:22` |

**Why They Exist**: Render prop functions for customizing DI graph visualization.

**Why Not Used**: The current implementation uses integrated rendering, not the render-prop pattern.

**Opportunity**:

- Enable customizable graph rendering for consumers
- **Recommendation**: Either document and use, or delete if not planned

---

### 2.4 Graph Styling Exports (5+ exports) - **OVER-EXPORTED INTERNALS**

| Export                 | Purpose          |
| ---------------------- | ---------------- |
| `graphNodeStyles`      | CSS-in-JS styles |
| `graphEdgeStyles`      | CSS-in-JS styles |
| `graphControlsStyles`  | CSS-in-JS styles |
| `LIFETIME_COLORS`      | Color constants  |
| `graphContainerStyles` | CSS-in-JS styles |

**Why They Exist**: Internal styling exported for potential consumer customization.

**Why Not Used**: Consumers don't customize styles - they use the default DevTools appearance.

**Recommendation**: Remove from public exports - keep internal

---

### 2.5 Unused React Components (3 exports)

| Export                 | File                          | Purpose                  |
| ---------------------- | ----------------------------- | ------------------------ |
| `ContainerInspector`   | `container-inspector.tsx:417` | Full inspector component |
| `ContainerKindBadge`   | `container-selector.tsx:332`  | Badge component          |
| `InheritanceModeBadge` | `container-selector.tsx:378`  | Badge component          |

**Why Not Used**:

- `ContainerInspector` - Superseded by plugin-based inspector
- Badges - Used internally but not re-exported through main index

**Recommendation**: Audit if used internally, remove from public API if not

---

### 2.6 Factory Functions (1 export)

| Export                  | File                         |
| ----------------------- | ---------------------------- |
| `defineDevToolsPlugins` | `react/define-plugin.ts:109` |

**Why It Exists**: Batch plugin creation (plural form).

**Why Not Used**: Consumers use `defineDevToolsPlugin()` (singular) for each plugin.

**Opportunity**: Could be useful for creating multiple plugins at once
**Recommendation**: Keep but document, or remove if pattern not needed

---

### 2.7 Type Exports (50+ exports) - **API SURFACE BLOAT**

Many type exports are unused:

| Category      | Examples                                                   |
| ------------- | ---------------------------------------------------------- |
| Command types | `UIOpenCommand`, `UICloseCommand`, `UIToggleCommand`, etc. |
| State types   | `UiState`, `TracingState`, `DevToolsRuntimeSnapshot`       |
| Config types  | `PluginConfigCore`, `TabConfigCore`                        |
| Store types   | `DevToolsStore`, `DevToolsStoreState`, etc.                |

**Why They Exist**: Comprehensive type exports for TypeScript consumers.

**Why Not Used**:

- Many are internal implementation types
- External consumers only need high-level types
- Over-export syndrome: "export everything just in case"

**Recommendation**:

- Keep essential public API types
- Remove internal types from public exports
- Document which types are part of public API

---

## 3. Root Cause Analysis

### 3.1 Architectural Evolution

The codebase shows signs of **architectural evolution**:

1. **DI Integration Attempt** (`devtools-graph.ts`, `devtools-flow-runtime-adapter.ts`) - Abandoned
2. **Render Props Pattern** (`di-render-props.tsx`) - Not adopted
3. **Shared Plugin Module** (`plugins/shared/`) - Premature abstraction

### 3.2 Over-Export Pattern

Many exports exist "just in case" external consumers need them:

- Internal utilities exported publicly
- Implementation components alongside factory functions
- Every internal type re-exported

### 3.3 Barrel File Inconsistency

The project has two import patterns:

- Direct imports: `import { X } from "./module.js"`
- Barrel imports: `import { X } from "./module/index.js"`

The barrels exist but aren't used, creating orphaned files.

### 3.4 Test File False Positives

Type test files (`.test-d.ts`) are flagged as unused because:

- Knip doesn't recognize the vitest type-testing convention
- These files don't produce runtime artifacts

---

## 4. Recommendations

### 4.1 Immediate Cleanup (Low Risk)

1. **Delete orphaned barrel files** (5 files):
   - `src/react/components/index.ts`
   - `src/react/context/index.ts`
   - `src/react/providers/index.ts`
   - `src/react/types/index.ts`
   - `src/react/utils/index.ts`

2. **Delete abandoned DI files** (2 files):
   - `src/di/devtools-graph.ts`
   - `src/runtime/devtools-flow-runtime-adapter.ts`

3. **Delete premature abstraction**:
   - `src/plugins/shared/index.ts`

### 4.2 Export Cleanup (Medium Risk)

1. **Remove internal exports from public API**:
   - Plugin content components
   - Graph styling exports
   - Internal utility functions

2. **Keep but audit**:
   - Type exports (identify public vs internal)
   - `defineDevToolsPlugins` (document or remove)

### 4.3 Configuration Update

Add to knip configuration:

```json
{
  "ignore": ["**/*.test-d.ts"]
}
```

### 4.4 Documentation

Create `PUBLIC_API.md` documenting:

- Which exports are public API
- Which exports are internal (subject to change)
- Deprecation notices for removed exports

---

## 5. Action Items

### Priority 1: Delete Dead Files (Immediate)

- [ ] Delete 5 orphaned barrel files
- [ ] Delete 2 DI integration files
- [ ] Delete 1 shared plugin barrel

### Priority 2: Clean Up Exports (Next Sprint)

- [ ] Remove internal component re-exports from `plugins/index.ts`
- [ ] Remove graph utility re-exports from `plugins/index.ts`
- [ ] Remove styling exports from `graph-visualization/index.ts`
- [ ] Audit type exports, remove internals

### Priority 3: Documentation (Ongoing)

- [ ] Document public API surface
- [ ] Add knip configuration for test files
- [ ] Add deprecation notices before removal

---

## Appendix: Full List of Unused Files

```
packages/devtools/src/di/devtools-graph.ts
packages/devtools/src/plugins/shared/index.ts
packages/devtools/src/react/components/index.ts
packages/devtools/src/react/context/index.ts
packages/devtools/src/react/providers/index.ts
packages/devtools/src/react/types/index.ts
packages/devtools/src/react/utils/index.ts
packages/devtools/src/runtime/devtools-flow-runtime-adapter.ts
packages/devtools/tests/graph-type-extensions.test-d.ts         (FALSE POSITIVE)
packages/devtools/tests/runtime-architecture-types.test-d.ts    (FALSE POSITIVE)
packages/devtools/tests/runtime/plugin-types.test-d.ts          (FALSE POSITIVE)
packages/devtools/tests/runtime/types.test-d.ts                 (FALSE POSITIVE)
packages/devtools/tests/types.test-d.ts                         (FALSE POSITIVE)
```

---

## Appendix: Unused Exports Summary

| Category                  | Count | Action                  |
| ------------------------- | ----- | ----------------------- |
| Graph utilities           | 5     | Delete                  |
| Plugin content components | 4     | Remove from public API  |
| DI render props           | 4     | Delete or document      |
| Graph styling             | 5+    | Remove from public API  |
| React components          | 3     | Audit usage             |
| Factory functions         | 1     | Document or remove      |
| Type exports              | 50+   | Audit, keep public only |

**Total Unused Exports**: ~232
**Recommended for Deletion**: ~50
**Recommended for Internal-Only**: ~150
**False Positives/Keep**: ~32
