# Runtime Package Improvement Specification

> **Analysis Date**: 2026-02-03
> **Current Rating**: 8.7/10
> **Target Rating**: 9.5/10
> **Package**: `@hex-di/runtime`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [High Priority Improvements](#3-high-priority-improvements)
4. [Medium Priority Improvements](#4-medium-priority-improvements)
5. [Low Priority Improvements](#5-low-priority-improvements)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Success Criteria](#7-success-criteria)
8. [Appendix: Full Analysis Data](#8-appendix-full-analysis-data)

---

## 1. Executive Summary

### 1.1 Overview

The `@hex-di/runtime` package is a production-grade dependency injection container with exceptional type safety and clean architecture. This specification outlines improvements to elevate the package from 8.7/10 to 9.5+/10.

### 1.2 Key Findings

| Category     | Current | Target | Gap                      |
| ------------ | ------- | ------ | ------------------------ |
| Code Quality | 8.3/10  | 9.5/10 | Duplication, large files |
| API Design   | 8.0/10  | 9.0/10 | Naming, ergonomics       |
| Testing      | 8.5/10  | 9.5/10 | Hooks, plugins coverage  |
| Type Safety  | 9.0/10  | 9.5/10 | Enhanced validation      |
| Performance  | 8.5/10  | 9.0/10 | Minor optimizations      |

### 1.3 Impact Summary

| Priority | Improvements | Estimated Effort | Impact      |
| -------- | ------------ | ---------------- | ----------- |
| High     | 5 items      | ~3-4 days        | +0.4 rating |
| Medium   | 7 items      | ~2-3 days        | +0.3 rating |
| Low      | 8 items      | ~2-3 days        | +0.1 rating |

---

## 2. Current State Assessment

### 2.1 Package Metrics

```
Source Files:     47 files
Lines of Code:    ~11,900 LOC
Test Files:       31 files
Test Cases:       ~420 tests
Public Exports:   80+ items
Dependencies:     0 external (only @hex-di/core, @hex-di/graph)
```

### 2.2 Strengths (Preserve)

1. **Type System Excellence**
   - Branded types with unique symbols
   - Phase-dependent type constraints
   - Captive dependency detection at compile time
   - Template literal error messages

2. **Error Handling**
   - 7 semantic error classes
   - `isProgrammingError` classification
   - Error aggregation on disposal
   - Rich context for debugging

3. **Architecture**
   - Clean hexagonal architecture
   - Perfect dependency direction
   - Symbol-based encapsulation
   - Framework agnostic

4. **Lifecycle Management**
   - LIFO disposal ordering
   - Three well-defined lifetimes
   - Cascade disposal
   - Lifecycle events

5. **Observability**
   - Built-in inspector and tracer
   - Zero-overhead when unused
   - State snapshots
   - Resolution hooks

### 2.3 Weaknesses (Address)

1. **Code Duplication**: ~400 lines in wrapper creation
2. **Large Files**: types.ts at 1,271 lines
3. **Naming Inconsistencies**: Multiple inspector factory names
4. **Testing Gaps**: Hooks and plugins under-tested
5. **API Ergonomics**: withOverrides uses strings, not ports

---

## 3. High Priority Improvements

### 3.1 Extract Shared Wrapper Logic

**Problem**: Duplicated code across `factory.ts` and `wrappers.ts`

**Current State**:

```typescript
// factory.ts:78-98
function attachBuiltinAPIs(wrapper, internal) {
  Object.defineProperty(wrapper, "inspector", { ... });
  Object.defineProperty(wrapper, "tracer", { ... });
}

// wrappers.ts:72-92 (DUPLICATE)
function attachBuiltinAPIs(wrapper, internal) {
  Object.defineProperty(wrapper, "inspector", { ... });
  Object.defineProperty(wrapper, "tracer", { ... });
}
```

**Files Affected**:

- `/src/container/factory.ts` (lines 78-98, 372-378, 542-548)
- `/src/container/wrappers.ts` (lines 72-92, 287-293)

**Solution**:

Create `/src/container/wrapper-utils.ts`:

```typescript
/**
 * Shared utilities for container wrapper creation.
 * Eliminates duplication between factory.ts and wrappers.ts.
 *
 * @packageDocumentation
 * @internal
 */

import type { InternalAccessible } from "./internal-types";
import { createInspector } from "../inspection/api";
import { createTracer } from "../tracing";
import { ContainerBrand, ScopeBrand } from "../types";

/**
 * Attaches built-in inspector and tracer APIs to a container wrapper.
 * These are non-enumerable properties always available on containers.
 */
export function attachBuiltinAPIs<T extends object>(
  wrapper: T,
  internal: InternalAccessible
): void {
  Object.defineProperty(wrapper, "inspector", {
    value: createInspector(internal),
    writable: false,
    enumerable: false,
    configurable: false,
  });

  Object.defineProperty(wrapper, "tracer", {
    value: createTracer(internal),
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

/**
 * Defines the container brand property for nominal typing.
 */
export function defineContainerBrand<TProvides, TExtends>(
  wrapper: object,
  _provides: TProvides,
  _extends: TExtends
): void {
  Object.defineProperty(wrapper, ContainerBrand, {
    value: { provides: null, extends: null },
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

/**
 * Defines non-enumerable parent getter for child containers.
 */
export function defineParentGetter<TParent>(wrapper: object, getParent: () => TParent): void {
  Object.defineProperty(wrapper, "parent", {
    get: getParent,
    enumerable: false,
    configurable: false,
  });
}

/**
 * Defines non-enumerable parentName property.
 */
export function defineParentName(wrapper: object, parentName: string | null): void {
  Object.defineProperty(wrapper, "parentName", {
    value: parentName,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

/**
 * Freezes a wrapper object to prevent modification.
 */
export function freezeWrapper<T extends object>(wrapper: T): Readonly<T> {
  return Object.freeze(wrapper);
}
```

**Estimated Reduction**: ~200 lines

**Acceptance Criteria**:

- [ ] New `wrapper-utils.ts` created with shared functions
- [ ] `factory.ts` imports from `wrapper-utils.ts`
- [ ] `wrappers.ts` imports from `wrapper-utils.ts`
- [ ] All existing tests pass
- [ ] No duplicate `attachBuiltinAPIs` definitions

---

### 3.2 Type-Safe Override API

> **Note:** `container.withOverrides()` does not exist in the current implementation. Overrides are applied at the **graph level** via `GraphBuilder.override()`, which produces a new, fully-typed graph and container. This is intentional — it preserves compile-time safety and deterministic resolution.

**Current Mechanism**:

```typescript
import { GraphBuilder } from '@hex-di/graph';
import { createContainer } from '@hex-di/runtime';

// Create a test container with mock overrides at the graph level
const testGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .override(MockLoggerAdapter)  // type-safe: MockLoggerAdapter must satisfy LoggerPort
  .build();

const testContainer = createContainer({ graph: testGraph, name: "Test" });
```

**Problem**: The `.override()` API on `GraphBuilder` already provides type safety, but the ergonomics could be improved for test scenarios where only a subset of adapters need to be replaced.

**Files Affected**:

- `/src/container/override-context.ts`
- `/src/container/base-impl.ts`
- `/src/types.ts`

**Potential Enhancement** (post-current-API):

A `TestGraphBuilder` utility in `@hex-di/testing` already wraps this pattern:

```typescript
import { TestGraphBuilder } from '@hex-di/testing';

const testGraph = TestGraphBuilder.from(appGraph)
  .override(MockLoggerAdapter)
  .build();
```

**Acceptance Criteria**:

- [ ] Document that `container.withOverrides()` does not exist
- [ ] Ensure `.override()` on `GraphBuilder` has full JSDoc coverage
- [ ] Add examples of `TestGraphBuilder` override patterns in testing docs
- [ ] Verify `override()` catches incompatible adapter types at compile time

---

### 3.3 Comprehensive Hook Testing

**Problem**: Resolution hooks minimally tested

**Current State**:

- `beforeResolve` / `afterResolve` only tested in async-resolution tests
- No systematic coverage of hook behavior
- Plugin system has limited tests

**Files to Create**:

- `/tests/resolution-hooks.test.ts`
- `/tests/hooks-composition.test.ts`

**Solution**:

Create comprehensive hook test suite:

```typescript
// tests/resolution-hooks.test.ts

import { describe, it, expect, vi } from "vitest";
import { createContainer, type ResolutionHooks } from "../src";
import { GraphBuilder } from "@hex-di/graph";
import { createAdapter, createPort } from "@hex-di/core";

describe("Resolution Hooks", () => {
  describe("beforeResolve", () => {
    it("should call beforeResolve before factory execution", () => {
      const callOrder: string[] = [];
      const hooks: ResolutionHooks = {
        beforeResolve: () => callOrder.push("beforeResolve"),
      };

      const factory = vi.fn(() => {
        callOrder.push("factory");
        return { value: 1 };
      });

      // ... test implementation

      expect(callOrder).toEqual(["beforeResolve", "factory"]);
    });

    it("should provide correct context in beforeResolve", () => {
      // Test: port, portName, lifetime, scopeId, parentPort, depth, isCacheHit
    });

    it("should set isCacheHit=false on first resolution", () => {});
    it("should set isCacheHit=true on cached resolution", () => {});
    it("should track depth for nested dependencies", () => {});
    it("should track parentPort for dependency chain", () => {});
    it("should provide containerId and containerKind", () => {});
  });

  describe("afterResolve", () => {
    it("should call afterResolve after factory execution", () => {});
    it("should provide duration in afterResolve context", () => {});
    it("should provide error=null on success", () => {});
    it("should provide error on factory failure", () => {});
    it("should call afterResolve even when factory throws", () => {});
  });

  describe("Hook Composition", () => {
    it("should call multiple beforeResolve hooks in order", () => {});
    it("should call multiple afterResolve hooks in reverse order", () => {});
    it("should handle hook that throws", () => {});
  });

  describe("Async Resolution Hooks", () => {
    it("should work with async factories", () => {});
    it("should track async resolution duration", () => {});
    it("should handle concurrent resolutions", () => {});
  });

  describe("Sealed Hooks", () => {
    it("should prevent modification after sealing", () => {});
    it("should allow reading sealed hooks", () => {});
  });

  describe("Dynamic Hook Installation", () => {
    it("should install hooks via HOOKS_ACCESS symbol", () => {});
    it("should merge with existing hooks", () => {});
  });
});
```

**Test Count Target**: 30+ new hook-specific tests

**Acceptance Criteria**:

- [ ] `resolution-hooks.test.ts` created with 20+ tests
- [ ] `hooks-composition.test.ts` created with 10+ tests
- [ ] All hook context properties tested
- [ ] Error scenarios tested
- [ ] Async hook behavior tested
- [ ] 100% hook code path coverage

---

### 3.4 Split Large Types File

**Problem**: `types.ts` at 1,271 lines is difficult to navigate

**Current State**:

```
/src/types.ts (1,271 lines)
├── Container type (lines 1-400)
├── Scope type (lines 401-600)
├── LazyContainer type (lines 601-750)
├── Type utilities (lines 751-1000)
├── Inheritance types (lines 1001-1150)
└── Misc types (lines 1151-1271)
```

**Solution**:

Split into focused modules:

```
/src/types/
├── index.ts              # Re-exports all types
├── container.ts          # Container type and related
├── scope.ts              # Scope type and related
├── lazy-container.ts     # LazyContainer type
├── utilities.ts          # Type utilities (Infer*, Is*, etc.)
├── inheritance.ts        # Inheritance mode types
└── phase.ts              # ContainerPhase and state types
```

**New File Structure**:

```typescript
// /src/types/index.ts
export * from "./container";
export * from "./scope";
export * from "./lazy-container";
export * from "./utilities";
export * from "./inheritance";
export * from "./phase";

// /src/types/container.ts (~350 lines)
export const ContainerBrand: unique symbol = Symbol("hex-di.Container");
export type Container<TProvides, TExtends, TAsyncPorts, TPhase> = ...;
export type ContainerMembers<...> = ...;
// ... container-specific types

// /src/types/scope.ts (~200 lines)
export const ScopeBrand: unique symbol = Symbol("hex-di.Scope");
export type Scope<TProvides, TAsyncPorts, TPhase> = ...;
export type ScopeMembers<...> = ...;
// ... scope-specific types

// /src/types/lazy-container.ts (~150 lines)
export type LazyContainer<TProvides, TExtends, TAsyncPorts> = ...;
// ... lazy container types

// /src/types/utilities.ts (~250 lines)
export type InferContainerProvides<T> = ...;
export type InferContainerEffectiveProvides<T> = ...;
export type InferScopeProvides<T> = ...;
export type IsResolvable<T, P> = ...;
export type ServiceFromContainer<T, P> = ...;
export type IsRootContainer<T> = ...;
export type IsChildContainer<T> = ...;
// ... type utilities

// /src/types/inheritance.ts (~150 lines)
export type InheritanceMode = "shared" | "forked" | "isolated";
export type InheritanceModeMap<TPortNames> = ...;
export type InheritanceModeConfig<TProvides> = ...;
// ... inheritance types

// /src/types/phase.ts (~100 lines)
export type ContainerPhase = "uninitialized" | "initialized";
export type ScopeDisposalState = "active" | "disposing" | "disposed";
// ... phase/state types
```

**Migration Strategy**:

1. Create new files with types
2. Update `/src/types.ts` to re-export from new files
3. Verify all imports still work
4. Remove old monolithic file

**Acceptance Criteria**:

- [ ] 6 new type files created under `/src/types/`
- [ ] Each file < 400 lines
- [ ] All existing imports continue to work
- [ ] No breaking changes to public API
- [ ] TSDoc comments preserved

---

### 3.5 Consolidate Inspector Exports

**Problem**: Multiple factory names for same functionality

**Current State**:

```typescript
// inspection/api.ts
export function createInspector(container) { ... }

// inspection/index.ts
export { createInspector as createInspectorAPI } from "./api";

// inspection/creation.ts
export function createRuntimeInspector(internal) { ... }
```

**Solution**:

Consolidate to single canonical export:

````typescript
// inspection/index.ts

/**
 * Creates an inspector API for a container.
 * This is the canonical factory - use this for all inspector creation.
 *
 * @param container - Container or scope to inspect
 * @returns Inspector API with state inspection methods
 *
 * @example
 * ```typescript
 * import { createInspector } from "@hex-di/runtime";
 *
 * const inspector = createInspector(container);
 * const snapshot = inspector.getSnapshot();
 * ```
 */
export { createInspector } from "./api";

// Remove duplicate exports:
// - createInspectorAPI (alias)
// - createRuntimeInspector (internal, don't export)
````

Update main index.ts:

```typescript
// src/index.ts

// BEFORE:
export { createInspector, createInspectorAPI } from "./inspection";

// AFTER:
export { createInspector } from "./inspection";
// Note: createInspectorAPI removed (was duplicate)
```

**Acceptance Criteria**:

- [ ] Single `createInspector` export
- [ ] `createInspectorAPI` alias removed
- [ ] `createRuntimeInspector` marked as `@internal`
- [ ] All usages updated to `createInspector`
- [ ] JSDoc updated with canonical example

---

## 4. Medium Priority Improvements

### 4.1 O(1) Child Container Unregistration

**Problem**: Linear complexity for child container removal

**Current State**:

```typescript
// lifecycle-manager.ts:121-124
const idx = this.childContainers.indexOf(child); // O(n)
if (idx !== -1) {
  this.childContainers.splice(idx, 1); // O(n)
}
```

**Solution**:

Use Map with container ID as key:

```typescript
// lifecycle-manager.ts

// BEFORE:
private childContainers: Container[] = [];

// AFTER:
private childContainers: Map<string, Container> = new Map();

// Registration
registerChild(child: Container): void {
  this.childContainers.set(child.name, child);  // O(1)
}

// Unregistration
unregisterChild(child: Container): void {
  this.childContainers.delete(child.name);  // O(1)
}

// Disposal (preserve LIFO via insertion order)
async dispose(): Promise<void> {
  const children = [...this.childContainers.values()].reverse();
  for (const child of children) {
    await child.dispose();
  }
  this.childContainers.clear();
}
```

**Acceptance Criteria**:

- [ ] `childContainers` changed to Map
- [ ] O(1) registration and unregistration
- [ ] LIFO disposal order preserved
- [ ] All existing tests pass

---

### 4.2 Remove Legacy Type Exports

**Problem**: Legacy types pollute API surface

**Current State**:

```typescript
// captive-dependency.ts
export type CaptiveDependencyErrorLegacy = ...;  // Why still exported?
```

**Solution**:

1. Audit all exports for "Legacy" suffix
2. Remove or mark as `@deprecated`
3. Provide migration path in CHANGELOG

```typescript
// BEFORE:
export type CaptiveDependencyErrorLegacy = ...;

// AFTER:
/** @deprecated Use CaptiveDependencyError instead. Will be removed in v5.0 */
export type CaptiveDependencyErrorLegacy = CaptiveDependencyError;
```

**Acceptance Criteria**:

- [ ] All "Legacy" types audited
- [ ] Deprecated types marked with JSDoc
- [ ] Removal timeline documented
- [ ] Migration guide provided

---

### 4.3 Add Plugin System Tests

**Problem**: Plugin system has minimal test coverage

**Files to Create**:

- `/tests/plugins/hooks-plugin.test.ts`
- `/tests/plugins/inspector-plugin.test.ts`
- `/tests/plugins/tracer-plugin.test.ts`

**Test Coverage Targets**:

- Hook installation via `HOOKS_ACCESS`
- Inspector state queries
- Tracer subscription and statistics
- Plugin composition

**Acceptance Criteria**:

- [ ] 15+ new plugin tests
- [ ] HOOKS_ACCESS tested
- [ ] Inspector API fully tested
- [ ] Tracer API fully tested

---

### 4.4 Improve Error Message Context

**Problem**: Some errors could provide more actionable guidance

**Enhancement Examples**:

```typescript
// BEFORE:
throw new ScopeRequiredError(portName);
// Message: "Cannot resolve scoped port 'UserContext' from root container"

// AFTER:
throw new ScopeRequiredError(portName, {
  suggestion: "Use container.createScope() to create a scope first",
  example: `const scope = container.createScope();\nscope.resolve(${portName});`,
});
// Message: "Cannot resolve scoped port 'UserContext' from root container.
//          Suggestion: Use container.createScope() to create a scope first.
//          Example: const scope = container.createScope();
//                   scope.resolve(UserContext);"
```

**Acceptance Criteria**:

- [ ] All 7 error classes have `suggestion` property
- [ ] Error messages include actionable guidance
- [ ] Examples shown for common mistakes

---

### 4.5 Timestamp Capture Optimization

**Problem**: `Date.now()` called on every memoization

**Current State**:

```typescript
// memo-map.ts:195
resolvedAt: Date.now(),  // Called even for cache hits
```

**Solution**:

Make timestamp capture configurable:

```typescript
// memo-map.ts

interface MemoMapOptions {
  /** Enable timestamp tracking for debugging. Default: true in dev, false in prod */
  trackTimestamps?: boolean;
}

class MemoMap {
  private readonly trackTimestamps: boolean;

  constructor(options?: MemoMapOptions) {
    this.trackTimestamps = options?.trackTimestamps ??
      (process.env.NODE_ENV !== "production");
  }

  getOrElseMemoize(...) {
    const entry: CacheEntry = {
      instance,
      finalizer,
      resolvedAt: this.trackTimestamps ? Date.now() : 0,
      // ...
    };
  }
}
```

**Acceptance Criteria**:

- [ ] Timestamp tracking configurable
- [ ] Disabled by default in production
- [ ] No breaking changes to API

---

### 4.6 Document Architectural Decisions

**Problem**: No high-level architecture documentation

**Solution**:

Create `/docs/architecture/runtime-architecture.md`:

```markdown
# Runtime Package Architecture

## Overview

[Diagram of layers]

## Design Decisions

### 1. Branded Types for Nominal Typing

Why: Prevent structural confusion between Container and Scope
Trade-off: Slightly more complex type definitions

### 2. Phase-Dependent Resolution

Why: Catch async resolution errors at compile time
Trade-off: Two-step initialization for async containers

### 3. Symbol-Based Internal Access

Why: Encapsulation without polluting public API
Trade-off: Requires symbol import for advanced usage

### 4. LIFO Disposal Ordering

Why: Ensure dependencies disposed before dependents
Trade-off: Slightly more complex disposal logic

## Module Relationships

[Dependency diagram]

## Extension Points

- Resolution hooks
- Inspector API
- Tracer API
```

**Acceptance Criteria**:

- [ ] Architecture document created
- [ ] All major design decisions documented
- [ ] Diagrams for module relationships
- [ ] Extension points documented

---

### 4.7 createContainer Options API

> **Note:** `createContainer` already accepts a single options object as its second parameter. The proposed "AFTER" API is the current form:

```typescript
// Current API — already implemented
createContainer(graph, { name: "App" });
// With hooks:
createContainer(graph, { name: "App", hooks: { beforeResolve: ... } });
```

**Problem identified**: Documentation or internal usages that show a two-parameter form (graph + separate options + hookOptions) are incorrect. The actual signature takes a single `{ name, hooks?, devtools? }` options object.

**Acceptance Criteria**:

- [ ] Verify all docs and examples use `createContainer(graph, { name })` form
- [ ] Remove any references to a two-parameter options form in documentation

---

## 5. Low Priority Improvements

### 5.1 Compile-Time Circular Dependency Detection

**Enhancement**: Add type-level cycle detection

```typescript
// Type-level DFS for cycle detection
type DetectCycle<
  TGraph extends Record<string, readonly string[]>,
  TNode extends keyof TGraph,
  TPath extends readonly string[] = [],
> = TNode extends TPath[number]
  ? { error: `Circular dependency: ${Join<[...TPath, TNode], " → ">}` }
  : TGraph[TNode] extends readonly (infer Dep extends string)[]
    ? Dep extends keyof TGraph
      ? DetectCycle<TGraph, Dep, [...TPath, TNode & string]>
      : never
    : never;
```

---

### 5.2 "Did You Mean?" Suggestions

**Enhancement**: Suggest similar port names on resolution errors

```typescript
throw new PortNotFoundError(portName, {
  didYouMean: findSimilar(portName, availablePorts),
  // "Port 'Loggerr' not found. Did you mean 'Logger'?"
});
```

---

### 5.3 Split inspection/helpers.ts

**Current**: 546 lines with multiple concerns

**Target Structure**:

```
/src/inspection/
├── helpers/
│   ├── kind-detection.ts
│   ├── phase-detection.ts
│   └── snapshot-builders.ts
```

---

### 5.4 Add Performance Benchmarks

**Create**: `/benchmarks/runtime-benchmarks.ts`

```typescript
// Benchmark scenarios
- Single resolution (singleton, scoped, transient)
- Deep dependency chain (10 levels)
- Wide dependency fan-out (20 deps)
- Concurrent async resolutions (100)
- Scope creation/disposal (1000 scopes)
- Child container creation
```

---

### 5.5 Move Context Variables to Core

**Current**: Context variable helpers in runtime
**Better**: Move to `@hex-di/core` or dedicated package

```typescript
// Move from @hex-di/runtime
createContextVariableKey;
getContextVariable;
setContextVariable;
getContextVariableOrDefault;

// To @hex-di/core (or @hex-di/context)
```

---

### 5.6 Add Explicit Return Types

**Enhancement**: Add explicit return types to internal functions

```typescript
// BEFORE:
function resolveAdapter(port) {
  // ...
}

// AFTER:
function resolveAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
  // ...
}
```

---

### 5.7 Enhance Type Documentation

**Enhancement**: Add `@typeParam` to Container type

```typescript
/**
 * A type-safe dependency injection container.
 *
 * @typeParam TProvides - Union of ports provided by the container's graph.
 *   For root containers, these are all ports from the original graph.
 *   For child containers, these are inherited ports from the parent.
 *
 * @typeParam TExtends - Union of ports added by child containers.
 *   Always `never` for root containers.
 *   For child containers, includes override and extension ports.
 *
 * @typeParam TAsyncPorts - Union of ports with async factories.
 *   These ports require initialization before sync resolution.
 *
 * @typeParam TPhase - Container initialization phase.
 *   "uninitialized" - Async ports cannot be resolved synchronously.
 *   "initialized" - All ports can be resolved synchronously.
 */
export type Container<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
> = ContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>;
```

---

### 5.8 Add State Machine Documentation

**Enhancement**: Document container lifecycle as state machine

```
┌──────────────────────────────────────────────────────────────┐
│                    Container Lifecycle                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    initialize()    ┌─────────────────┐     │
│  │ Uninitialized│ ────────────────► │   Initialized   │     │
│  │   Phase     │                    │      Phase      │     │
│  └──────┬──────┘                    └────────┬────────┘     │
│         │                                    │              │
│         │  resolve()                         │  resolve()   │
│         │  (sync-only ports)                 │  (all ports) │
│         │                                    │              │
│         │  resolveAsync()                    │  resolveAsync()
│         │  (all ports)                       │  (all ports) │
│         │                                    │              │
│         └──────────────┬─────────────────────┘              │
│                        │                                    │
│                        │  dispose()                         │
│                        ▼                                    │
│                 ┌─────────────┐                             │
│                 │  Disposed   │                             │
│                 │   (final)   │                             │
│                 └─────────────┘                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Roadmap

### Phase 1: Code Quality (Days 1-2)

| Task                      | Priority | Effort | Impact            |
| ------------------------- | -------- | ------ | ----------------- |
| 3.1 Extract wrapper logic | High     | 4h     | Reduces 200 LOC   |
| 3.4 Split types.ts        | High     | 3h     | Better navigation |
| 3.5 Consolidate exports   | High     | 1h     | Cleaner API       |
| 4.1 O(1) unregistration   | Medium   | 2h     | Performance       |
| 4.2 Remove legacy types   | Medium   | 1h     | Cleaner API       |

### Phase 2: Type Safety (Days 3-4)

| Task                    | Priority | Effort | Impact               |
| ----------------------- | -------- | ------ | -------------------- |
| 3.2 Type-safe overrides | High     | 6h     | Major DX improvement |
| 4.4 Error context       | Medium   | 3h     | Better debugging     |
| 4.7 Options API         | Medium   | 3h     | Simpler API          |

### Phase 3: Testing (Days 5-6)

| Task               | Priority | Effort | Impact               |
| ------------------ | -------- | ------ | -------------------- |
| 3.3 Hook testing   | High     | 6h     | 30+ new tests        |
| 4.3 Plugin testing | Medium   | 4h     | 15+ new tests        |
| 5.4 Benchmarks     | Low      | 3h     | Performance baseline |

### Phase 4: Documentation (Days 7-8)

| Task                   | Priority | Effort | Impact          |
| ---------------------- | -------- | ------ | --------------- |
| 4.6 Architecture docs  | Medium   | 4h     | Maintainability |
| 5.7 Type documentation | Low      | 2h     | DX improvement  |
| 5.8 State machine docs | Low      | 1h     | Understanding   |

---

## 7. Success Criteria

### 7.1 Quantitative Metrics

| Metric             | Current   | Target   |
| ------------------ | --------- | -------- |
| Test count         | ~420      | 470+     |
| Hook test coverage | ~20%      | 95%      |
| Largest file       | 1,271 LOC | <400 LOC |
| Duplicate code     | ~400 LOC  | <50 LOC  |
| Legacy exports     | 3         | 0        |

### 7.2 Quality Gates

- [ ] All existing tests pass
- [ ] No new `any` types introduced
- [ ] No new type casts introduced
- [ ] No `eslint-disable` comments
- [ ] 100% JSDoc coverage maintained
- [ ] All public APIs documented
- [ ] No breaking changes without deprecation

### 7.3 Rating Targets

| Category     | Current    | Target     |
| ------------ | ---------- | ---------- |
| Code Quality | 8.3/10     | 9.0/10     |
| API Design   | 8.0/10     | 9.0/10     |
| Testing      | 8.5/10     | 9.5/10     |
| **Overall**  | **8.7/10** | **9.5/10** |

---

## 8. Appendix: Full Analysis Data

### 8.1 Analysis Sources

This specification was compiled from 20 parallel sub-agent analyses:

**Explorer Agents (10)**:

1. Structure exploration - File organization, module architecture
2. Type system exploration - Type patterns, sophistication
3. Public API surface - Exports, interfaces
4. Error handling - Error hierarchy, patterns
5. Testing coverage - Test files, coverage gaps
6. Performance patterns - Optimizations, anti-patterns
7. Memory management - Disposal, lifecycle
8. DI patterns - Lifetimes, scoping
9. Documentation - JSDoc, comments
10. Integrations - Package dependencies

**Expert Agents (10)**:

1. Architecture Guardian - Hexagonal compliance
2. TypeScript Type System Architect - Type sophistication
3. DI Container Architect - DI best practices
4. Dependency Graph Architect - Graph modeling
5. AI Optimization Architect - AI ergonomics
6. Composition Test Architect - Test patterns
7. General Purpose - API design review
8. General Purpose - Security analysis
9. General Purpose - Code quality metrics
10. React Ports Integrator - React integration

### 8.2 Individual Scores

| Agent                     | Focus         | Score                     |
| ------------------------- | ------------- | ------------------------- |
| Architecture Guardian     | Architecture  | 95/100                    |
| Type System Architect     | Types         | 8/10                      |
| DI Container Architect    | DI            | A-                        |
| AI Optimization Architect | AI Ergonomics | 8.5/10                    |
| API Design                | API           | 8/10                      |
| Code Quality              | Quality       | 8.3/10                    |
| Security                  | Security      | 9/10 (no vulnerabilities) |
| Testing                   | Tests         | 8.5/10                    |
| Documentation             | Docs          | 9/10                      |

### 8.3 Files Requiring Changes

| File                                           | Changes              | Priority |
| ---------------------------------------------- | -------------------- | -------- |
| `/src/types.ts`                                | Split into 6 files   | High     |
| `/src/container/factory.ts`                    | Extract shared logic | High     |
| `/src/container/wrappers.ts`                   | Extract shared logic | High     |
| `/src/container/override-context.ts`           | Type-safe overrides  | High     |
| `/src/container/base-impl.ts`                  | Update withOverrides | High     |
| `/src/inspection/index.ts`                     | Consolidate exports  | High     |
| `/src/container/internal/lifecycle-manager.ts` | O(1) unregistration  | Medium   |
| `/src/captive-dependency.ts`                   | Remove legacy        | Medium   |
| `/src/errors/index.ts`                         | Add suggestions      | Medium   |
| `/src/util/memo-map.ts`                        | Optional timestamps  | Medium   |

---

## Document History

| Version | Date       | Author          | Changes               |
| ------- | ---------- | --------------- | --------------------- |
| 1.0     | 2026-02-03 | Claude Analysis | Initial specification |

---

_This specification was generated through comprehensive analysis by 20 specialized sub-agents examining architecture, types, testing, security, performance, and code quality aspects of the @hex-di/runtime package._
