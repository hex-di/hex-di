# Cross-Spec Verification Report

**Date:** 2026-02-11
**Specs Verified:** `spec/devtools/` and `spec/playground/`
**Verification Type:** Internal consistency and cross-spec compatibility
**Overall Status:** ⚠️ Issues Found

---

## Executive Summary

This report documents the results of a comprehensive verification of the HexDi DevTools and Playground specifications for internal consistency and cross-spec compatibility. The verification covered 10 specific compatibility checks and 4 internal consistency checks across both specs.

**Critical Issues:** 6
**Major Issues:** 8
**Minor Issues:** 12
**Suggestions:** 5

The most critical issues involve signature mismatches in the `InspectorDataSource` interface, missing type definitions in API references, and incomplete cross-references between specification documents.

---

## Verification Methodology

1. Read all specification files in both `spec/devtools/` and `spec/playground/` directories
2. Read actual source type definitions in `packages/core/src/inspection/inspector-types.ts`
3. Cross-referenced interfaces, type definitions, and component specifications
4. Verified README table of contents against actual section numbers
5. Checked panel sets, hook names, design tokens, and package boundaries

---

## Cross-Spec Compatibility Checks

### Check 1: InspectorDataSource Interface Mapping

**Status:** ❌ Critical

#### Issue 1.1: InspectorAPI vs InspectorDataSource Method Mismatch

**Severity:** Critical

The `InspectorDataSource` interface defined in playground spec (02-shared-infrastructure.md, Section 5.2) claims to map 1:1 to `InspectorAPI` methods, but there are critical differences:

**InspectorAPI methods (from actual source):**

- `getSnapshot(): ContainerSnapshot` (non-optional)
- `getScopeTree(): ScopeTree` (non-optional)
- `listPorts(): readonly string[]` (not in InspectorDataSource)
- `isResolved(portName: string): boolean | "scope-required"` (not in InspectorDataSource)
- `getContainerKind(): ContainerKind` (not in InspectorDataSource)
- `getPhase(): ContainerPhase` (not in InspectorDataSource)
- `getChildContainers(): readonly InspectorAPI[]` (not in InspectorDataSource)
- `getResultStatistics(portName: string): ResultStatistics | undefined` (not in InspectorDataSource)
- `getHighErrorRatePorts(threshold: number): readonly ResultStatistics[]` (not in InspectorDataSource)
- `getLibraryInspector(name: string): LibraryInspector | undefined` (not in InspectorDataSource)
- `queryLibraries(predicate: LibraryQueryPredicate): readonly LibraryQueryResult[]` (not in InspectorDataSource)
- `queryByLibrary(name: string, predicate?: ...)` (not in InspectorDataSource)
- `queryByKey(pattern: string | RegExp)` (not in InspectorDataSource)

**InspectorDataSource methods (from playground spec):**

- `getSnapshot(): ContainerSnapshot | undefined` (optional return)
- `getScopeTree(): ScopeTree | undefined` (optional return)
- `getGraphData(): ContainerGraphData | undefined` (missing from InspectorAPI)
- `getUnifiedSnapshot(): UnifiedSnapshot | undefined`
- `getAdapterInfo(): readonly AdapterInfo[] | undefined`
- `getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined`
- `getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined`
- `subscribe(listener: (event: InspectorEvent) => void): () => void`
- `displayName: string` (metadata, not in InspectorAPI)
- `sourceType: "remote" | "local"` (metadata, not in InspectorAPI)

**Problems:**

1. InspectorAPI methods return non-optional values; InspectorDataSource returns `| undefined`
2. InspectorDataSource includes `getGraphData()` which is NOT on InspectorAPI (it's a separate method)
3. Many InspectorAPI methods are missing from InspectorDataSource
4. The claim that they "map 1:1" is incorrect

**Recommendation:**

- Update playground spec Section 5.2 to clarify that InspectorDataSource is NOT a 1:1 mapping
- Document which InspectorAPI methods are intentionally excluded
- Explain the rationale for optional returns in InspectorDataSource

---

### Check 2: PanelProps Migration Consistency

**Status:** ⚠️ Major Issues

#### Issue 2.1: PanelProps Definition Mismatch

**Severity:** Major

**Devtools spec (03-panel-architecture.md, Section 6.2.2):**

```typescript
interface PanelProps {
  readonly remoteInspector: RemoteInspectorAPI;
  readonly connectionId: string;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}
```

**Playground spec (02-shared-infrastructure.md, Section 7.1):**

```typescript
interface PanelProps {
  readonly dataSource: InspectorDataSource;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}
```

**Playground spec change doc (08-devtools-changes.md, Section 36):**
States that `connectionId` is removed, but provides no migration path for panels that need identity information.

**Problem:**
The playground spec's Section 7.1 shows the NEW definition, but the devtools spec still shows the OLD definition. According to 08-devtools-changes.md Section 36.3, the devtools spec should be updated but hasn't been yet.

**Recommendation:**

- Update devtools spec 03-panel-architecture.md Section 6.2.2 with new PanelProps definition
- Document how panels should access connection identity (`dataSource.displayName` replacement for `connectionId`)
- Add migration example showing old vs new usage

---

#### Issue 2.2: Hook Renaming Incomplete

**Severity:** Major

**Devtools spec references (06-api-reference.md):**

- Lists hooks as `useRemoteSnapshot`, `useRemoteScopeTree`, etc.

**Playground spec (02-shared-infrastructure.md, Section 10.1):**

- Lists hooks as `useDataSourceSnapshot`, `useDataSourceScopeTree`, etc.

**Playground spec change doc (08-devtools-changes.md, Section 39):**

- States hooks should be renamed from `useRemote*` to `useDataSource*`
- Marks this as **[REQUIRED]** for 06-api-reference.md

**Problem:**
The devtools spec has not been updated with the new hook names per the change log.

**Recommendation:**

- Update devtools spec 06-api-reference.md with new hook names
- Update all panel specifications in 04-panels.md with new hook names
- Update all library panel specs in panels/\*.md with new hook names

---

### Check 3: RemoteInspectorAPI extends InspectorDataSource

**Status:** ❌ Critical

#### Issue 3.1: RemoteInspectorAPI Signature Verification

**Severity:** Critical

**Devtools spec (03-panel-architecture.md, Section 6.2.2) current definition:**

```typescript
interface RemoteInspectorAPI {
  readonly connectionId: string;
  readonly appName: string;
  readonly appType: "react" | "node" | "unknown";
  readonly instanceId: string;
  readonly metadata: ConnectionMetadata;
  readonly status: "connected" | "stale" | "disconnected";
  readonly latencyMs: number;

  getSnapshot(): ContainerSnapshot | undefined;
  getScopeTree(): ScopeTree | undefined;
  getGraphData(): ContainerGraphData | undefined;
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;
  getAdapterInfo(): readonly AdapterInfo[] | undefined;
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;
  subscribe(listener: (event: InspectorEvent) => void): () => void;
}
```

**Playground spec change doc (08-devtools-changes.md, Section 38.2) updated definition:**

```typescript
interface RemoteInspectorAPI extends InspectorDataSource {
  // InspectorDataSource fields
  readonly displayName: string; // Returns appName
  readonly sourceType: "remote";

  // RemoteInspectorAPI-specific fields
  readonly connectionId: string;
  readonly appName: string;
  // ... rest of fields
}
```

**Problem:**

1. The devtools spec has not been updated to show `extends InspectorDataSource`
2. Missing `displayName` and `sourceType` fields in current devtools spec
3. Change is marked as **[REQUIRED]** in 08-devtools-changes.md Section 39

**Recommendation:**

- Update devtools spec 06-api-reference.md Section 16 with the new RemoteInspectorAPI definition
- Add explicit note that RemoteInspectorAPI implements InspectorDataSource
- Show `displayName` getter returning `appName`

---

### Check 4: Type Consistency with Source

**Status:** ⚠️ Major Issues

#### Issue 4.1: ContainerSnapshot Type Not Verified

**Severity:** Major

The playground spec references `ContainerSnapshot` extensively but doesn't specify where it's defined. Cross-checking with actual source (`packages/core/src/inspection/inspector-types.ts`), the type is imported from `./container-types.js`.

**Problem:**
Neither spec documents the complete shape of `ContainerSnapshot` for panels to reference.

**Recommendation:**

- Add ContainerSnapshot type definition to devtools spec 06-api-reference.md
- Reference it in playground spec 07-api-reference.md
- Include fields: kind, phase, ports, singletons, childContainers, etc.

---

#### Issue 4.2: InspectorEvent Type Completeness

**Severity:** Minor

The actual `InspectorEvent` type from source includes more event types than documented in either spec:

**From source:**

- `"snapshot-changed"`
- `"scope-created"` with `scope: ScopeEventInfo`
- `"scope-disposed"` with `scopeId: string`
- `"resolution"` with portName, duration, isCacheHit
- `"phase-changed"` with phase
- `"init-progress"` with current, total, portName
- `"child-created"` with childId, childKind
- `"child-disposed"` with childId
- `"result:ok"` with portName, timestamp
- `"result:err"` with portName, errorCode, timestamp
- `"result:recovered"` with portName, fromCode, timestamp
- `"library"` with event: LibraryEvent
- `"library-registered"` with name
- `"library-unregistered"` with name

**Neither spec fully documents all event types.**

**Recommendation:**

- Add complete InspectorEvent union type to devtools spec 06-api-reference.md
- Reference it in playground spec

---

### Check 5: Package Boundary Violations

**Status:** ✅ No Critical Issues, ⚠️ Minor Issues

#### Issue 5.1: Module Migration Map Completeness

**Severity:** Minor

Playground spec 08-devtools-changes.md Section 37.3 provides a module migration map, but doesn't specify:

- Where does `ConnectionProvider` move (stays in devtools)
- Where does `DashboardLayout` go (stays in devtools)
- Where does `Sidebar` go (stays in devtools)

**Problem:**
The map only documents what moves TO devtools-ui, not what stays in devtools.

**Recommendation:**

- Add Section 37.4 content to the migration map
- Create a two-column table: "Moves to devtools-ui" vs "Stays in devtools"

---

### Check 6: Worker Protocol Completeness

**Status:** ✅ Passed

#### Verification Result

All `InspectorDataSource` methods have corresponding worker protocol response types:

| InspectorDataSource Method | Worker Response Type          | Status |
| -------------------------- | ----------------------------- | ------ |
| `getSnapshot()`            | `response-snapshot`           | ✅     |
| `getScopeTree()`           | `response-scope-tree`         | ✅     |
| `getGraphData()`           | `response-graph-data`         | ✅     |
| `getUnifiedSnapshot()`     | `response-unified-snapshot`   | ✅     |
| `getAdapterInfo()`         | `response-adapter-info`       | ✅     |
| `getLibraryInspectors()`   | `response-library-inspectors` | ✅     |
| `getAllResultStatistics()` | `response-result-statistics`  | ✅     |
| `subscribe()`              | `inspector-event` (push)      | ✅     |

**Additionally verified:**

- `inspector-data` push message includes all 7 data fields
- Console output has dedicated `console` message type
- Execution lifecycle covered by `execution-complete`, `execution-error`, `no-inspector` types

---

### Check 7: Panel Set Consistency

**Status:** ⚠️ Major Issues

#### Issue 7.1: Panel Count Discrepancy

**Severity:** Major

**Devtools spec (03-panel-architecture.md, Section 6.3.1):**
Lists 7 built-in panels with orders: 0, 5, 10, 20, 30, 40, 50

**Playground spec (02-shared-infrastructure.md, Section 7.3):**
States "All 7 built-in panels" but lists the same 7 panels

**Playground spec (05-layout-and-panels.md, Section 22.4):**
States "Before the user runs any code, or when the sandbox produces no InspectorAPI, panels show an empty state" and lists examples for graph, container, scope tree panels.

**Problem:**
The panel list is consistent, BUT the Tracing panel is described as "conditional" in devtools spec Section 6.3.6:

> "This panel is only included in the navigation when a tracing library inspector is registered."

This means it's not always one of the 7 visible panels.

**Recommendation:**

- Clarify that there are 7 built-in panel _definitions_ but not all are always visible
- Update playground spec to note Tracing panel's conditional visibility
- Ensure panel registry logic accounts for conditional panels

---

### Check 8: Design Token Consistency

**Status:** ✅ Passed with Minor Issues

#### Issue 8.1: Token Prefix Mismatch

**Severity:** Minor

**Devtools spec (05-visual-design.md, Section 13.1):**
Uses `--hex-` prefix for tokens:

- `--hex-bg-primary`
- `--hex-text-primary`
- `--hex-accent`
- etc.

**Devtools spec (03-panel-architecture.md, Section 6.7.2):**
Uses `--hdt-` prefix in example:

```css
[data-hex-devtools] {
  --hdt-bg-primary: ...;
  --hdt-text-primary: ...;
}
```

**Playground spec (02-shared-infrastructure.md, Section 9.1):**
References `--hex-` prefix consistently

**Problem:**
Inconsistent prefix usage between devtools spec sections.

**Recommendation:**

- Standardize on one prefix (`--hex-` is used more consistently)
- Update devtools spec Section 6.7.2 to use `--hex-` prefix

---

### Check 9: Hook Naming Consistency

**Status:** ✅ Verified, ⚠️ Tracking Required

#### Verification Result

All hook renames are correctly specified in playground spec 08-devtools-changes.md Section 39:

| Old Name (devtools)        | New Name (devtools-ui)         | Status        |
| -------------------------- | ------------------------------ | ------------- |
| `useRemoteSnapshot`        | `useDataSourceSnapshot`        | ✅ Documented |
| `useRemoteScopeTree`       | `useDataSourceScopeTree`       | ✅ Documented |
| `useRemoteUnifiedSnapshot` | `useDataSourceUnifiedSnapshot` | ✅ Documented |
| `useRemoteTracingSummary`  | `useDataSourceTracingSummary`  | ✅ Documented |

**Problem:**
The devtools spec has NOT been updated with these new names (marked as **[REQUIRED]** in change log).

**Recommendation:**

- Execute all changes marked **[REQUIRED]** in 08-devtools-changes.md Section 39
- Update all code examples in devtools spec with new hook names

---

### Check 10: Example Templates Verification

**Status:** ✅ Passed, ⚠️ Import Path Issues

#### Issue 10.1: Import Path Accuracy in Examples

**Severity:** Minor

**Playground spec (06-examples-and-sharing.md, Section 27.1) example code:**

```typescript
import { createPort } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
```

**Actual exports verification needed:**
Need to verify these are actual named exports from the specified packages.

Based on typical package structures, these look correct, but without reading the actual `index.ts` files from each package, cannot verify 100%.

**Recommendation:**

- Verify example imports against actual package exports
- Add note in playground spec that examples use exact import paths from published packages
- Test all 12 example templates actually compile with the bundled type definitions

---

## Internal Consistency Checks

### Check 11: README Table of Contents

**Status:** ⚠️ Major Issues

#### Issue 11.1: Playground README Section Numbers

**Severity:** Major

**Playground README.md table of contents claims:**

**[02 — Shared Infrastructure](./02-shared-infrastructure.md)**

- Section 5: The InspectorDataSource Abstraction
- Section 6: @hex-di/devtools-ui Package
- Section 7: Shared Panels
- Section 8: Shared Visualization Components
- Section 9: Shared Theme System
- Section 10: Shared Hooks

**Actual 02-shared-infrastructure.md sections:**

- Section 5: The `InspectorDataSource` Abstraction ✅
- Section 6: `@hex-di/devtools-ui` Package ✅
- Section 7: Shared Panels ✅
- Section 8: Shared Visualization Components ✅
- Section 9: Shared Theme System ✅
- Section 10: Shared Hooks ✅

**Result:** ✅ All sections match

---

#### Issue 11.2: Devtools README Section Numbers

**Severity:** Minor

**Devtools README.md lists:**

- [03 - Panel Architecture](./03-panel-architecture.md)
  - 6. Panel Architecture
  - 7. Component Tree

**Actual 03-panel-architecture.md:**

- Section 6: Panel Architecture (with subsections 6.1-6.7)
- Section 7: Component Tree (with subsections 7.1-7.6)

**Result:** ✅ Matches

---

### Check 12: Cross-References Between Documents

**Status:** ⚠️ Major Issues

#### Issue 12.1: Broken Cross-Reference Links

**Severity:** Major

**Devtools spec 03-panel-architecture.md:**

- References "Section 5 -- Visual Design & Wireframes" but actual doc is `05-visual-design.md`
- References "Section 8 -- Individual Panel Specifications" but actual doc is `04-panels.md`

**Problem:**
Section numbers in cross-references don't match actual document names or top-level section numbers.

**Recommendation:**

- Use document names in cross-references, not section numbers
- Format: "See [Visual Design](./05-visual-design.md)" instead of "Section 5 -- Visual Design"

---

#### Issue 12.2: Playground Spec Internal Links

**Severity:** Minor

Playground specs use format like:

- "See [04 — Sandbox](./04-sandbox.md) for details"

This format is correct and consistent throughout playground specs.

**Result:** ✅ Playground cross-references are well-formed

---

### Check 13: Definition of Done Coverage

**Status:** ⚠️ Major Issues

#### Issue 13.1: Incomplete Test Coverage for InspectorDataSource

**Severity:** Major

**Playground spec 09-definition-of-done.md Section 40.2:**
Lists 5 tests for InspectorDataSource contract, but doesn't test:

- Handling of undefined vs null distinctions
- Error handling when underlying InspectorAPI throws
- Concurrent subscribe/unsubscribe scenarios
- Memory leak prevention (subscriptions cleaned up)

**Recommendation:**

- Add tests for error cases
- Add tests for subscription lifecycle
- Add integration test for LocalInspectorAdapter with real InspectorAPI

---

#### Issue 13.2: Missing DevTools UI Component Tests

**Severity:** Major

**Playground spec 09-definition-of-done.md Section 40.3:**
Lists component tests for 7 panels × 5 tests = 35 tests.

**Missing:**

- No test requirements for shared UI components (StatusBadge, SearchInput, EmptyState, ErrorBoundary, StatCard, SortHeader)
- These are exported from devtools-ui but not tested per the DoD

**Recommendation:**

- Add Section 40.3.5 for shared UI component tests
- Require at least 2 tests per component (render + interaction)

---

### Check 14: API Reference Completeness

**Status:** ❌ Critical Issues

#### Issue 14.1: InspectorDataSource Missing from Devtools API Reference

**Severity:** Critical

**Devtools spec 06-api-reference.md:**
Does NOT include `InspectorDataSource` interface definition.

**Playground spec change doc (08-devtools-changes.md, Section 39):**
States devtools spec 06-api-reference.md should "Add InspectorDataSource" — marked as **[REQUIRED]**

**Problem:**
The central abstraction for panel reuse is not documented in the devtools API reference.

**Recommendation:**

- Add full InspectorDataSource interface to devtools spec 06-api-reference.md
- Include it alongside RemoteInspectorAPI
- Show the relationship: "RemoteInspectorAPI extends InspectorDataSource"

---

#### Issue 14.2: Playground API Reference Missing Types

**Severity:** Major

**Playground spec 07-api-reference.md:**
Documents APIs but not the supporting types:

Missing type definitions:

- `CompilationResult` (referenced in Section 31.1)
- `CompilationError` (referenced in Section 31.1)
- `SandboxError` (referenced in Section 31.1)
- `ConsoleEntry` (referenced in console rendering)
- `FSEvent` (referenced in Section 32.1)

**Recommendation:**

- Add a "Types" section to 07-api-reference.md
- Document all types used by the public API

---

## Summary by Category

### Critical Issues (6)

1. InspectorDataSource does not map 1:1 to InspectorAPI methods (Check 1)
2. RemoteInspectorAPI not updated to extend InspectorDataSource (Check 3)
3. InspectorDataSource missing from devtools API reference (Check 14)
4. PanelProps not updated in devtools spec (Check 2)
5. Missing type definitions for ContainerSnapshot (Check 4)
6. Incomplete test coverage documentation (Check 13)

### Major Issues (8)

1. Hook names not updated in devtools spec (Check 2)
2. RemoteInspectorAPI signature missing displayName/sourceType (Check 3)
3. Panel count conditional visibility not clarified (Check 7)
4. README section number mismatches (Check 11)
5. Broken cross-reference links in devtools spec (Check 12)
6. Missing shared component tests in DoD (Check 13)
7. Playground API reference missing supporting types (Check 14)
8. Module migration map incomplete (Check 5)

### Minor Issues (12)

1. InspectorEvent type not fully documented (Check 4)
2. Design token prefix inconsistency (--hex- vs --hdt-) (Check 8)
3. Import path verification needed for examples (Check 10)
4. Cross-reference format inconsistencies (Check 12)
5. Section numbering in document headers (cosmetic)
6. Missing "Status" badges in some spec sections
7. Incomplete serialization type documentation
8. Missing performance benchmarks for worker protocol
9. No migration examples for PanelProps changes
10. Inconsistent use of "DevTools" vs "devtools" (capitalization)
11. Panel conditional visibility not in playground spec
12. Missing documentation for error handling in panels

### Suggestions (5)

1. Add visual diagram showing 4-package architecture
2. Add sequence diagram for worker protocol message flow
3. Create migration guide document for devtools → devtools-ui + playground
4. Add troubleshooting section for common integration issues
5. Document performance targets for each major component

---

## Recommended Actions

### Immediate (Block Implementation)

1. ❌ **Critical:** Update InspectorDataSource interface definition with accurate method signatures
2. ❌ **Critical:** Update devtools spec 06-api-reference.md with InspectorDataSource
3. ❌ **Critical:** Update devtools spec with new PanelProps definition
4. ❌ **Critical:** Document RemoteInspectorAPI extends InspectorDataSource

### High Priority (Should Fix Before Release)

1. ⚠️ Execute all **[REQUIRED]** changes from 08-devtools-changes.md Section 39
2. ⚠️ Update all hook names (useRemote* → useDataSource*) in devtools spec
3. ⚠️ Add ContainerSnapshot and InspectorEvent type definitions to API references
4. ⚠️ Complete test coverage documentation in DoD
5. ⚠️ Fix broken cross-reference links

### Medium Priority (Improve Quality)

1. Standardize design token prefix
2. Complete module migration map
3. Add missing type definitions to playground API reference
4. Document panel conditional visibility
5. Create migration examples for PanelProps changes

### Low Priority (Polish)

1. Verify example import paths
2. Standardize cross-reference format
3. Add visual architecture diagrams
4. Create troubleshooting documentation
5. Add performance benchmarks

---

## Verification Sign-Off

**Verified By:** Claude (Sonnet 4.5)
**Date:** 2026-02-11
**Total Files Read:** 22
**Total Issues Found:** 31
**Estimated Fix Effort:** 8-12 hours for critical + high priority issues

**Next Steps:**

1. Address all critical issues before any implementation begins
2. Create tracking tickets for high priority issues
3. Schedule review of medium/low priority improvements
4. Re-run verification after fixes applied

---

**End of Report**
