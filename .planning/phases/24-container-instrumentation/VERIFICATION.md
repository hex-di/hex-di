---
phase: 24-container-instrumentation
verified: 2026-02-06T16:10:00Z
status: gaps_found
score: 5/7 must-haves verified
gaps:
  - truth: "Entire container tree can be instrumented with dynamic child auto-instrumentation"
    status: partial
    reason: "Tree walking of existing children works, but live subscription for dynamic children is non-functional due to two issues: (1) runtime does not emit child-created events yet, (2) reverse InspectorAPI->Container mapping for new children has a chicken-and-egg problem"
    artifacts:
      - path: "packages/tracing/src/instrumentation/tree.ts"
        issue: "Live subscription listener at line 160-176 calls getContainerFromInspector on new child inspectors, but new children have not been registered via registerContainerMapping yet, so the lookup always returns undefined. Additionally, the runtime never emits child-created events."
    missing:
      - "Runtime must emit child-created inspector events when containers are created (outside Phase 24 scope)"
      - "child-created event payload should include the Container reference (or the registration mechanism needs rethinking so new children can be looked up)"
  - truth: "Instrumentation behavioral correctness is verified by tests"
    status: failed
    reason: "Zero behavioral tests exist for instrumentation. Only an export-surface test verifies the functions are exported. No tests verify span creation, parent-child relationships, cleanup, filtering, error recording, or any of the core instrumentation behavior."
    artifacts:
      - path: "packages/tracing/tests/"
        issue: "No test file exists for instrumentation behavior (span-stack, container, tree, hooks)"
    missing:
      - "Unit tests for span-stack (push/pop/getActiveSpan/clearStack)"
      - "Unit tests for instrumentContainer (span creation, attributes, cleanup, double-instrumentation, error handling)"
      - "Unit tests for createTracingHook (returns valid ResolutionHooks, span creation)"
      - "Unit tests for port filtering (evaluatePortFilter, shouldTracePort, matchesPortPattern)"
      - "Integration tests for parent-child span relationships via span stack"
      - "Integration tests for instrumentContainerTree with mock containers"
---

# Phase 24: Container Instrumentation and Context Propagation Verification Report

**Phase Goal:** Developers can instrument a single container or entire tree with one call; resolution spans form parent-child relationships across container boundaries
**Verified:** 2026-02-06T16:10:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                      | Status   | Evidence                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Single container can be instrumented with tracing hooks                    | VERIFIED | `instrumentContainer` in `container.ts` (251 lines) installs beforeResolve/afterResolve hooks via `container.addHook()`, returns idempotent cleanup                                                                                                                        |
| 2   | Resolution spans have correct attributes (INST-06)                         | VERIFIED | `container.ts` lines 141-161 set `hex-di.port.name`, `hex-di.port.lifetime`, `hex-di.resolution.cached`, `hex-di.container.name`, `hex-di.container.kind`, `hex-di.resolution.depth`, plus optional scope/parent/inheritance attributes                                    |
| 3   | Span stack maintains active span context (INST-03)                         | VERIFIED | `span-stack.ts` (133 lines) implements module-level LIFO stack with pushSpan/popSpan/getActiveSpan/clearStack/getStackDepth                                                                                                                                                |
| 4   | Standalone tracing hooks can be created for manual registration (INST-07)  | VERIFIED | `hooks.ts` (232 lines) exports `createTracingHook(tracer, options)` returning `ResolutionHooks` with beforeResolve/afterResolve                                                                                                                                            |
| 5   | All instrumentation functions are exported from package                    | VERIFIED | `instrumentation/index.ts` barrel exports all public APIs; `src/index.ts` re-exports them; integration test at `tracing.test.ts:247-260` validates exact export surface                                                                                                    |
| 6   | Entire container tree instrumented with dynamic child auto-instrumentation | PARTIAL  | `instrumentContainerTree` walks existing tree correctly, but live subscription for dynamically created children is non-functional: runtime does not emit `child-created` events, and InspectorAPI-to-Container reverse lookup has chicken-and-egg problem for new children |
| 7   | Instrumentation behavioral correctness is verified by tests                | FAILED   | Zero behavioral tests for instrumentation. Only export-surface verification exists.                                                                                                                                                                                        |

**Score:** 5/7 truths verified

### Required Artifacts

| Artifact                                             | Expected                          | Status   | Details                                                                                                                                                         |
| ---------------------------------------------------- | --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/tracing/src/instrumentation/span-stack.ts` | Module-level span stack           | VERIFIED | 133 lines, exports pushSpan/popSpan/getActiveSpan/clearStack/getStackDepth, imported by container.ts and hooks.ts                                               |
| `packages/tracing/src/instrumentation/types.ts`      | Instrumentation options and types | VERIFIED | 337 lines, exports AutoInstrumentOptions, PortFilter, HookableContainer, evaluatePortFilter, isPredicateFilter, isDeclarativeFilter, DEFAULT_INSTRUMENT_OPTIONS |
| `packages/tracing/src/instrumentation/container.ts`  | Single container instrumentation  | VERIFIED | 251 lines, exports instrumentContainer, uses WeakMap for double-instrumentation, installs beforeResolve/afterResolve hooks                                      |
| `packages/tracing/src/instrumentation/tree.ts`       | Tree-wide instrumentation         | PARTIAL  | 216 lines, exports instrumentContainerTree, tree walking works for existing containers, but live subscription for dynamic children is non-functional            |
| `packages/tracing/src/instrumentation/hooks.ts`      | Standalone hook factory           | VERIFIED | 232 lines, exports createTracingHook returning ResolutionHooks                                                                                                  |
| `packages/tracing/src/instrumentation/utils.ts`      | Tree walking utilities            | VERIFIED | 175 lines, exports registerContainerMapping, getContainerFromInspector, matchesPortPattern, shouldTracePort                                                     |
| `packages/tracing/src/instrumentation/index.ts`      | Barrel exports                    | VERIFIED | 31 lines, re-exports all public APIs from submodules                                                                                                            |
| `packages/tracing/src/index.ts`                      | Package root exports              | VERIFIED | Lines 92-115 export all instrumentation functions and types                                                                                                     |

### Key Link Verification

| From                       | To                       | Via                                                              | Status | Details                                                                                |
| -------------------------- | ------------------------ | ---------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| container.ts               | span-stack.ts            | `import { pushSpan, popSpan } from "./span-stack.js"`            | WIRED  | pushSpan called in beforeResolve (line 173), popSpan called in afterResolve (line 196) |
| container.ts               | types.ts                 | `import { evaluatePortFilter } from "./types.js"`                | WIRED  | evaluatePortFilter called in shouldTrace (line 117)                                    |
| container.ts               | HookableContainer        | `container.addHook("beforeResolve", ...)`                        | WIRED  | Lines 227-228 install both hooks; lines 232-234 remove them in cleanup                 |
| tree.ts                    | container.ts             | `import { instrumentContainer } from "./container.js"`           | WIRED  | instrumentContainer called in instrumentOne (line 136)                                 |
| tree.ts                    | utils.ts                 | `import { registerContainerMapping, getContainerFromInspector }` | WIRED  | registerContainerMapping at line 157, getContainerFromInspector at lines 168/184       |
| tree.ts                    | InspectorAPI             | `inspectorToWalk.subscribe(listener)` / `getChildContainers()`   | WIRED  | subscribe at line 178, getChildContainers at line 163/182                              |
| hooks.ts                   | span-stack.ts            | `import { pushSpan, popSpan } from "./span-stack.js"`            | WIRED  | pushSpan at line 174, popSpan at line 197                                              |
| hooks.ts                   | types.ts                 | `import { evaluatePortFilter } from "./types.js"`                | WIRED  | evaluatePortFilter at line 118                                                         |
| index.ts (instrumentation) | All submodules           | Re-exports                                                       | WIRED  | All public APIs re-exported                                                            |
| index.ts (package root)    | instrumentation/index.ts | `export { ... } from "./instrumentation/index.js"`               | WIRED  | Lines 94-115                                                                           |

### Requirements Coverage

| Requirement                                                                   | Status                 | Details                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INST-01: instrumentContainer installs hooks, returns cleanup                  | SATISFIED              | `container.ts` installs beforeResolve/afterResolve via addHook, returns idempotent cleanup function                                                                                                                       |
| INST-02: instrumentContainerTree walks hierarchy                              | PARTIAL                | Walks existing hierarchy correctly, but live subscription for dynamic children is non-functional                                                                                                                          |
| INST-03: Module-level span stack                                              | SATISFIED              | `span-stack.ts` implements module-level array with push/pop/getActive                                                                                                                                                     |
| INST-04: beforeResolve creates child span, pushes to stack                    | SATISFIED              | `container.ts` line 139 calls tracer.startSpan, line 173 calls pushSpan                                                                                                                                                   |
| INST-05: afterResolve pops span, records error/success, ends with try/finally | SATISFIED              | `container.ts` lines 196-223: popSpan, recordException on error, setStatus, span.end() in finally                                                                                                                         |
| INST-06: Resolution span attributes                                           | SATISFIED              | All 4 required attributes set (hex-di.port.name, hex-di.port.lifetime, hex-di.resolution.cached, hex-di.container.name) plus bonus attributes (container.kind, resolution.depth, parent.port, scope.id, inheritance.mode) |
| INST-07: createTracingHook returns standalone hooks                           | SATISFIED              | `hooks.ts` exports createTracingHook returning ResolutionHooks object                                                                                                                                                     |
| INST-08: AutoInstrumentOptions fields                                         | SATISFIED              | `types.ts` defines traceSyncResolutions, traceAsyncResolutions, traceCachedResolutions, portFilter, additionalAttributes, minDurationMs, includeStackTrace                                                                |
| INST-09: Cross-container tracing via shared span stack                        | SATISFIED (structural) | Shared module-level span stack ensures parent-child relationships across containers; however no behavioral test proves this works end-to-end                                                                              |

### Anti-Patterns Found

| File   | Line | Pattern | Severity | Impact                                                |
| ------ | ---- | ------- | -------- | ----------------------------------------------------- |
| (none) | -    | -       | -        | No anti-patterns found in instrumentation source code |

**PERF-05 compliance:** No `any` types, no type casts (`as X`), no `eslint-disable` comments found in any instrumentation file. TypeScript typecheck passes clean.

### Human Verification Required

### 1. Cross-container parent-child span relationships

**Test:** Create a root container and child container, instrument both via `instrumentContainerTree`, resolve a port in the root that depends on a port in the child, and verify the resulting spans have correct parent-child relationship.
**Expected:** The child container's resolution span should be a child of the root container's resolution span.
**Why human:** Requires a working container with adapters and dependency chains across containers, which cannot be verified through static analysis.

### 2. Dynamic child container auto-instrumentation

**Test:** Instrument a container tree, then create a new child container dynamically, then resolve from it.
**Expected:** The new child container should be auto-instrumented and produce spans.
**Why human:** Depends on runtime emitting `child-created` events and the InspectorAPI reverse lookup working for new children -- currently expected to fail.

### 3. Double-instrumentation cleanup

**Test:** Call `instrumentContainer` on the same container twice with different options, then resolve a port.
**Expected:** Only one set of spans should be created (old hooks cleaned up before new ones installed).
**Why human:** Requires runtime execution with real container instances.

### Gaps Summary

**Gap 1: Live subscription for dynamic child containers (INST-02 partial)**

The `instrumentContainerTree` function correctly walks existing container hierarchies and instruments all found containers. However, the live subscription mechanism for dynamically created child containers has two structural issues:

1. **Runtime does not emit `child-created` events:** The `InspectorEvent` type includes `child-created` in its union type definition (`packages/core/src/inspection/inspector-types.ts:133`), but the runtime implementation never emits this event. Searching the entire `packages/runtime/src` directory for "child-created" yields zero results. This means the subscription listener in `tree.ts:160-176` will never fire.

2. **InspectorAPI-to-Container reverse lookup chicken-and-egg problem:** Even if the runtime did emit `child-created` events, the listener calls `getContainerFromInspector(childInspector)` on new child inspectors. But `registerContainerMapping` is only called inside `walkTree` (line 157), creating a circular dependency: you need the container to register the mapping, but you need the mapping to find the container.

Issue (1) is outside Phase 24 scope (runtime must add event emission). Issue (2) is a design gap in Phase 24's tree.ts that needs to be addressed -- the `child-created` event payload includes `childId` and `childKind` but not the Container reference, and there's no mechanism to look up the Container from just these fields.

**Impact:** Static tree instrumentation works. Dynamic child auto-instrumentation does not work.

**Gap 2: No behavioral tests for instrumentation**

All 156 tests in the tracing package pre-date Phase 24 and test adapters, utilities, propagation, and export surface. Zero tests verify that:

- `instrumentContainer` actually creates spans when resolutions occur
- `createTracingHook` produces working hooks
- Span stack maintains correct LIFO ordering under concurrent use
- Port filtering (predicate and declarative forms) correctly filters
- Cleanup functions properly remove hooks
- Error recording produces correct span status and exception events
- `minDurationMs` filtering works
- Double-instrumentation handling works
- Parent-child span relationships form correctly

Without behavioral tests, the correctness of all 9 INST requirements relies entirely on manual testing and code review. The structural verification confirms the code is substantive and properly wired, but behavioral correctness is unproven.

---

_Verified: 2026-02-06T16:10:00Z_
_Verifier: Claude (gsd-verifier)_
