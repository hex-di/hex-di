# Architecture Patterns: @hex-di/runtime Improvements

**Project:** Runtime DI Improvements (8.7/10 to 9.5/10)
**Researched:** 2026-02-03
**Focus:** Integration patterns for 20 prioritized improvements

---

## Executive Summary

This document provides architectural guidance for integrating the 20 improvements identified in the runtime package improvement specification. The existing architecture is well-structured with clear separation of concerns. Most improvements are additive or refactoring-focused, requiring minimal architectural changes.

**Key Integration Principles:**

1. **Preserve existing boundaries** - The current hexagonal architecture is sound
2. **Extract before extend** - Duplication removal precedes new features
3. **Types first** - Type file restructuring enables downstream changes
4. **Incremental migration** - Backward compatibility via overloads, then deprecation

---

## 1. Current Architecture Overview

### Module Dependency Graph

```
                         PUBLIC API
                            |
                       src/index.ts
                            |
        +-------------------+-------------------+
        |                   |                   |
   src/types.ts      src/container/       src/inspection/
        |            factory.ts               index.ts
        |            wrappers.ts              api.ts
        |                 |                   creation.ts
        +--------+--------+                      |
                 |                               |
        src/container/impl.ts  <-----------------+
              (re-exports)
                 |
    +------------+------------+
    |            |            |
root-impl.ts  child-impl.ts  base-impl.ts
    |            |            |
    +-----+------+-----+------+
          |            |
  internal/       resolution/
  - adapter-registry.ts    - engine.ts
  - lifecycle-manager.ts   - async-engine.ts
  - inheritance-resolver.ts- hooks-runner.ts
  - async-initializer.ts   - hooks.ts
```

### Component Boundaries (Preserve)

| Component                | Responsibility                | Files                                  |
| ------------------------ | ----------------------------- | -------------------------------------- |
| **Types Layer**          | Type definitions, brands      | `types.ts`, `types/*.ts`               |
| **Container Layer**      | Container lifecycle, wrappers | `container/factory.ts`, `wrappers.ts`  |
| **Implementation Layer** | Resolution logic              | `container/*-impl.ts`, `internal/*.ts` |
| **Resolution Layer**     | Factory execution, hooks      | `resolution/*.ts`                      |
| **Inspection Layer**     | DevTools integration          | `inspection/*.ts`                      |

---

## 2. Wrapper Utils Extraction (Improvement 3.1)

### Current Problem

Duplicated code between `factory.ts` and `wrappers.ts`:

- `attachBuiltinAPIs()` - 40 lines duplicated (factory.ts:72-92, wrappers.ts:72-92)
- `AttachableContainer` interface - duplicated type definition
- `ContainerWithBuiltinAPIs` interface - duplicated type definition
- Property definition boilerplate - ~200 lines total

### Recommended Integration

**New File:** `/src/container/wrapper-utils.ts`

**Position in Module Graph:**

```
           src/container/
                |
    +-----------+-----------+
    |           |           |
factory.ts  wrappers.ts  wrapper-utils.ts (NEW)
    |           |           |
    +-----------+-----------+
                |
          (both import from wrapper-utils.ts)
```

**Module Contents:**

```typescript
// wrapper-utils.ts - New file

import type { InternalAccessible } from "../inspection/creation.js";
import type { InspectorAPI } from "../inspection/types.js";
import type { TracingAPI } from "@hex-di/core";
import { createBuiltinInspectorAPI, createBuiltinTracerAPI } from "../inspection/builtin-api.js";
import { ContainerBrand, ScopeBrand } from "../types.js";
import { unreachable } from "../util/unreachable.js";

/**
 * Type for container objects that can have inspector/tracer attached.
 * @internal
 */
export interface AttachableContainer extends InternalAccessible {
  inspector?: InspectorAPI;
  tracer?: TracingAPI;
}

/**
 * Type for container with required built-in API properties.
 * @internal
 */
export interface ContainerWithBuiltinAPIs extends InternalAccessible {
  readonly inspector: InspectorAPI;
  readonly tracer: TracingAPI;
}

/**
 * Attaches built-in inspector and tracer APIs to a container wrapper.
 * Uses Object.defineProperty for non-enumerable, readonly properties.
 * @internal
 */
export function attachBuiltinAPIs(
  container: AttachableContainer
): asserts container is ContainerWithBuiltinAPIs {
  const inspectorAPI = createBuiltinInspectorAPI(container);
  Object.defineProperty(container, "inspector", {
    value: inspectorAPI,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  const tracerAPI = createBuiltinTracerAPI();
  Object.defineProperty(container, "tracer", {
    value: tracerAPI,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

/**
 * Defines a non-enumerable container brand property for nominal typing.
 * @internal
 */
export function defineContainerBrand<TProvides, TExtends>(wrapper: object): void {
  Object.defineProperty(wrapper, ContainerBrand, {
    get(): never {
      return unreachable("Container brand is type-only");
    },
    enumerable: false,
    configurable: false,
  });
}

/**
 * Defines a non-enumerable parent getter for containers.
 * @internal
 */
export function defineParentGetter<TParent>(wrapper: object, getParent: () => TParent): void {
  Object.defineProperty(wrapper, "parent", {
    get: getParent,
    enumerable: false,
    configurable: false,
  });
}
```

**Import Updates:**

```typescript
// factory.ts - Remove local definitions, import from wrapper-utils
import {
  attachBuiltinAPIs,
  defineContainerBrand,
  defineParentGetter,
  type AttachableContainer,
  type ContainerWithBuiltinAPIs,
} from "./wrapper-utils.js";

// wrappers.ts - Same imports
import {
  attachBuiltinAPIs,
  defineContainerBrand,
  defineParentGetter,
  type AttachableContainer,
  type ContainerWithBuiltinAPIs,
} from "./wrapper-utils.js";
```

### Build Order

1. Create `wrapper-utils.ts` with extracted functions and types
2. Update `factory.ts` imports, delete local definitions (lines 44-98)
3. Update `wrappers.ts` imports, delete local definitions (lines 38-92)
4. Verify all tests pass
5. No public API changes required

**Estimated Reduction:** ~200 lines of duplicated code removed.

---

## 3. Types File Split (Improvement 3.4)

### Current Problem

`types.ts` at 1,271 lines contains multiple cohesive groups that should be separate modules:

```
/src/types.ts (1,271 lines)
|-- ContainerPhase, ContainerKind (lines 28-55)
|-- DevTools options (lines 56-165)
|-- Brand symbols (lines 166-200)
|-- Container type (lines 201-625)
|-- Scope type (lines 626-836)
|-- Inheritance types (lines 837-920)
|-- Type utilities (lines 921-1125)
|-- LazyContainer type (lines 1126-1271)
```

### Recommended Structure

```
src/types/
|-- index.ts              # Re-exports (maintains backward compatibility)
|-- container.ts          # Container, ContainerMembers, ContainerBrand (~350 lines)
|-- scope.ts              # Scope, ScopeMembers, ScopeBrand (~200 lines)
|-- lazy-container.ts     # LazyContainer, LazyContainerMembers (~150 lines)
|-- utilities.ts          # Infer*, Is*, ServiceFromContainer (~200 lines)
|-- inheritance.ts        # InheritanceMode, InheritanceModeConfig (~100 lines)
|-- options.ts            # CreateContainerOptions, CreateChildOptions (~80 lines)
```

### Module Dependencies (Important for Build Order)

```
types/options.ts (independent)
   |
   +-- No internal dependencies

types/inheritance.ts (independent)
   |
   +-- imports: @hex-di/core (Port)

types/container.ts
   |
   +-- imports: @hex-di/core (Port, InferService)
   +-- imports: @hex-di/graph (Graph, InferGraphProvides, InferGraphAsyncPorts)
   +-- imports: ./options.ts (CreateChildOptions, CreateContainerOptions)
   +-- imports: ./inheritance.ts (InheritanceModeConfig)
   +-- imports: ../inspection/symbols.js (INTERNAL_ACCESS)
   +-- imports: ../inspection/internal-state-types.js (ContainerInternalState)
   +-- imports: ../scope/lifecycle-events.js (ScopeLifecycleListener, etc.)

types/scope.ts
   |
   +-- imports: @hex-di/core (Port, InferService)
   +-- imports: ../inspection/symbols.js (INTERNAL_ACCESS)
   +-- imports: ../inspection/internal-state-types.js (ScopeInternalState)
   +-- imports: ../scope/lifecycle-events.js (ScopeLifecycleListener, etc.)

types/lazy-container.ts
   |
   +-- imports: @hex-di/core (Port, InferService)
   +-- imports: ./container.ts (Container)

types/utilities.ts
   |
   +-- imports: @hex-di/core (Port, InferService)
   +-- imports: ./container.ts (Container)
   +-- imports: ./scope.ts (Scope)

types/index.ts
   |
   +-- re-exports from all type modules
```

### Integration Strategy

**Phase 1: Create New Files (No Breaking Changes)**

```typescript
// src/types/index.ts (NEW)
export * from "./container.js";
export * from "./scope.js";
export * from "./lazy-container.js";
export * from "./utilities.js";
export * from "./inheritance.js";
export * from "./options.js";
```

**Phase 2: Update src/types.ts**

```typescript
// src/types.ts (MODIFIED - becomes simple re-export)
export * from "./types/index.js";
```

**All existing imports continue to work unchanged:**

```typescript
// Existing code - no changes required
import { Container, Scope } from "../types.js";
```

### Build Order

1. Create `types/` directory
2. Create `types/options.ts` (no internal dependencies)
3. Create `types/inheritance.ts` (no internal dependencies)
4. Create `types/container.ts` (imports options, inheritance)
5. Create `types/scope.ts` (independent of container)
6. Create `types/lazy-container.ts` (imports container)
7. Create `types/utilities.ts` (imports container, scope)
8. Create `types/index.ts` (re-exports all)
9. Update `src/types.ts` to re-export from `types/index.ts`
10. Verify all 420+ tests pass

---

## 4. Type-Safe Override Builder (Improvement 3.2)

### Current Problem

`withOverrides` uses string keys, losing type safety:

```typescript
// Current API - string keys, no type checking
container.withOverrides(
  { Loggerr: () => mockLogger }, // Typo not caught at compile time!
  () => {
    /* ... */
  }
);
```

### Recommended Integration

**New Types:** Add to `types/container.ts` (after split)

```typescript
// types/container.ts additions

/**
 * Type-safe override builder interface.
 *
 * Provides fluent API for specifying port overrides with compile-time
 * validation of port names and factory return types.
 */
export interface OverrideBuilder<TProvides extends Port<unknown, string>> {
  /**
   * Adds an override for a port.
   *
   * @param port - The port to override (must be in TProvides)
   * @param factory - Factory returning InferService<P>
   */
  override<P extends TProvides>(
    port: P,
    factory: () => InferService<P>
  ): OverrideBuilder<TProvides>;

  /**
   * Builds the override map for internal use.
   * @internal
   */
  build(): ReadonlyMap<string, () => unknown>;
}
```

**New Implementation:** `/src/container/override-builder.ts`

```typescript
// override-builder.ts (NEW)

import type { Port, InferService } from "@hex-di/core";
import type { OverrideBuilder } from "../types.js";

export function createOverrideBuilder<
  TProvides extends Port<unknown, string>,
>(): OverrideBuilder<TProvides> {
  const overrides = new Map<string, () => unknown>();

  const builder: OverrideBuilder<TProvides> = {
    override<P extends TProvides>(
      port: P,
      factory: () => InferService<P>
    ): OverrideBuilder<TProvides> {
      overrides.set(port.__portName, factory);
      return builder;
    },

    build(): ReadonlyMap<string, () => unknown> {
      return overrides;
    },
  };

  return builder;
}
```

**Integration Points:**

1. **`base-impl.ts`** - Add overloaded signature for builder pattern:

```typescript
// base-impl.ts - Add new withOverrides implementation

// Existing string-based (deprecated but preserved for backward compatibility)
withOverrides<R>(
  overrides: OverrideFactoryMap,
  fn: () => R
): R;

// NEW: Type-safe builder pattern
withOverrides<R>(
  configure: (builder: OverrideBuilder<TProvides | TExtends>) => OverrideBuilder<TProvides | TExtends>,
  fn: () => R
): R;

// Implementation with runtime type check
withOverrides<R>(
  arg1: OverrideFactoryMap | ((builder: OverrideBuilder<TProvides | TExtends>) => OverrideBuilder<TProvides | TExtends>),
  fn: () => R
): R {
  let overrides: OverrideFactoryMap;

  if (typeof arg1 === "function") {
    // Builder pattern
    const builder = createOverrideBuilder<TProvides | TExtends>();
    const configured = arg1(builder);
    const map = configured.build();
    overrides = {};
    for (const [portName, factory] of map) {
      overrides[portName] = factory;
    }
  } else {
    // Legacy string-based (deprecated)
    overrides = arg1;
  }

  // Existing implementation continues...
  const context = new OverrideContext<TProvides | TExtends>(this, overrides);
  pushOverrideContext(context);
  try {
    return fn();
  } finally {
    popOverrideContext();
  }
}
```

2. **Type Updates Required:**
   - Update `ContainerMembers.withOverrides` signature in types
   - Update `ScopeMembers` if scopes have withOverrides

### Module Graph Addition

```
src/container/
    |
    +-- override-builder.ts (NEW)
    |       |
    |       +-- imported by base-impl.ts
    |
    +-- override-context.ts (unchanged - works with OverrideFactoryMap)
```

### Build Order

1. Add `OverrideBuilder` type to `types/container.ts` (or new file after split)
2. Create `override-builder.ts` with implementation
3. Add overloaded signature to `ContainerMembers.withOverrides` in types
4. Update `base-impl.ts` with runtime type detection and new implementation
5. Add tests for type-safe override pattern
6. Mark string-based overload as `@deprecated` in JSDoc

---

## 5. O(1) Child Container Data Structure (Improvement 4.1)

### Current Problem

```typescript
// lifecycle-manager.ts - Current O(n) implementation
private readonly childContainers: Disposable[] = [];

unregisterChildContainer(child: Disposable): void {
  const idx = this.childContainers.indexOf(child);  // O(n) lookup
  if (idx !== -1) {
    this.childContainers.splice(idx, 1);  // O(n) removal
  }
}
```

### Recommended Change

**File:** `/src/container/internal/lifecycle-manager.ts`

**Strategy:** Use Map with container name as key (names are already unique per parent)

```typescript
// lifecycle-manager.ts - Updated data structures

// BEFORE:
private readonly childContainers: Disposable[] = [];

// AFTER:
private readonly childContainers: Map<string, DisposableWithName> = new Map();
private childContainerOrder: string[] = [];  // Preserves LIFO disposal order

interface DisposableWithName extends Disposable {
  readonly name: string;  // Containers already have this property
}
```

**Updated Methods:**

```typescript
registerChildContainer(child: DisposableWithName): void {
  this.childContainers.set(child.name, child);  // O(1) insertion
  this.childContainerOrder.push(child.name);    // O(1) order tracking
}

unregisterChildContainer(child: DisposableWithName): void {
  this.childContainers.delete(child.name);  // O(1) removal
  // Note: childContainerOrder cleaned up during dispose()
}

async dispose(singletonMemo: MemoMap, parentUnregister?: ParentUnregisterFn): Promise<void> {
  if (this.disposed) return;
  this.disposed = true;

  // Dispose child containers in LIFO order, skipping already-unregistered
  for (let i = this.childContainerOrder.length - 1; i >= 0; i--) {
    const name = this.childContainerOrder[i];
    const child = this.childContainers.get(name);
    if (child !== undefined && !child.isDisposed) {
      await child.dispose();
    }
  }
  this.childContainers.clear();
  this.childContainerOrder = [];

  // Rest of disposal unchanged...
}
```

### Interface Updates

**File:** `/src/container/internal-types.ts`

```typescript
// Current DisposableChild interface
export interface DisposableChild {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}

// MODIFIED: Add name property (containers already have this)
export interface DisposableChild {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
  readonly name: string; // ADD: Required for O(1) Map lookup
}
```

**Verification:** Container wrappers in `factory.ts` and `wrappers.ts` already expose `name` property, so this interface change is non-breaking.

### Affected Files

| File                   | Change                          |
| ---------------------- | ------------------------------- |
| `lifecycle-manager.ts` | Data structure + method updates |
| `internal-types.ts`    | Add `name` to `DisposableChild` |
| `wrappers.ts`          | No changes (already has `name`) |
| `factory.ts`           | No changes (already has `name`) |

### Build Order

1. Add `name` to `DisposableChild` interface
2. Verify all `DisposableChild` usages already provide `name`
3. Update `LifecycleManager` data structures (Map + order array)
4. Update `registerChildContainer` method
5. Update `unregisterChildContainer` method
6. Update `dispose` method for LIFO from order array
7. Verify all disposal tests pass

### Complexity Analysis

| Operation  | Before                 | After                  |
| ---------- | ---------------------- | ---------------------- |
| Register   | O(1) push              | O(1) Map.set + push    |
| Unregister | O(n) indexOf + splice  | O(1) Map.delete        |
| Dispose    | O(n) reverse iteration | O(n) reverse iteration |

**Net Improvement:** Unregistration from O(n) to O(1). Registration and disposal unchanged.

---

## 6. Inspector Export Consolidation (Improvement 3.5)

### Current Problem

Multiple exports for same functionality:

```typescript
// inspection/api.ts
export function createInspector(container) { ... }

// inspection/index.ts
export { createInspector } from "./api";

// inspection/creation.ts
export function createInspector(internal) { ... }  // Different signature!

// inspection/index.ts also re-exports
export { createInspector as createRuntimeInspector } from "./creation";
```

This creates confusion about which factory to use.

### Recommended Structure

**File:** `/src/inspection/index.ts` (Simplified)

```typescript
// inspection/index.ts - Consolidated exports

// =============================================================================
// Primary API Export (canonical factory)
// =============================================================================

/**
 * Creates an inspector API for a container.
 * This is the canonical factory - use this for all inspector creation.
 */
export { createInspector } from "./api.js";

// =============================================================================
// Internal Exports (for package use only)
// =============================================================================

// @internal - Used by factory.ts and wrappers.ts
export { createBuiltinInspectorAPI, createBuiltinTracerAPI } from "./builtin-api.js";

// @internal - Symbols for state access
export { INTERNAL_ACCESS, ADAPTER_ACCESS, HOOKS_ACCESS, TRACING_ACCESS } from "./symbols.js";

// =============================================================================
// Type Exports
// =============================================================================

export type { InspectorAPI, ContainerSnapshot, ScopeTree } from "./types.js";
export type {
  ContainerInternalState,
  ScopeInternalState,
  MemoMapSnapshot,
} from "./internal-state-types.js";

// =============================================================================
// REMOVED Exports (were duplicates or internal)
// =============================================================================

// DO NOT export: createInspectorAPI (was alias for createInspector)
// DO NOT export: createRuntimeInspector (internal, use createInspector)
```

**Update Main Index:**

```typescript
// src/index.ts - Updated public exports

// BEFORE:
export { createInspector, createInspectorAPI } from "./inspection";

// AFTER:
export { createInspector } from "./inspection";
// Note: createInspectorAPI removed (was duplicate)
```

### Build Order

1. Audit all usages of inspector factory functions
2. Update `inspection/index.ts` to remove duplicate exports
3. Update `src/index.ts` to export only `createInspector`
4. Update any tests using `createInspectorAPI` alias
5. Document removal in CHANGELOG

---

## 7. Suggested Phase Structure

Based on architectural dependencies, the 20 improvements should be implemented in this order:

### Phase 1: Foundation (Days 1-2)

**Goal:** Extract shared code, restructure types, no functional changes

| Item                      | Files                 | Risk | Depends On |
| ------------------------- | --------------------- | ---- | ---------- |
| 3.4 Split types.ts        | `types/*.ts`          | Low  | None       |
| 3.1 Extract wrapper-utils | `wrapper-utils.ts`    | Low  | None       |
| 3.5 Consolidate exports   | `inspection/index.ts` | Low  | None       |
| 4.2 Remove legacy types   | Various               | Low  | 3.4        |

**Validation:** All existing tests must pass, no public API changes.

### Phase 2: Data Structures (Day 3)

**Goal:** Performance improvements without API changes

| Item                       | Files                  | Risk | Depends On |
| -------------------------- | ---------------------- | ---- | ---------- |
| 4.1 O(1) child unregister  | `lifecycle-manager.ts` | Low  | None       |
| 4.5 Timestamp optimization | `memo-map.ts`          | Low  | None       |

**Validation:** Performance benchmarks, disposal order tests.

### Phase 3: Type Safety (Days 4-5)

**Goal:** Enhanced type checking for APIs

| Item                    | Files                        | Risk   | Depends On |
| ----------------------- | ---------------------------- | ------ | ---------- |
| 3.2 Type-safe overrides | `override-builder.ts`, types | Medium | 3.4        |
| 4.7 Options API merge   | `factory.ts`, types          | Medium | 3.4        |

**Validation:** Type-level tests (.test-d.ts), backward compatibility tests.

### Phase 4: Testing (Days 6-7)

**Goal:** Coverage improvements

| Item               | Files                            | Risk | Depends On |
| ------------------ | -------------------------------- | ---- | ---------- |
| 3.3 Hook testing   | `tests/resolution-hooks.test.ts` | Low  | None       |
| 4.3 Plugin testing | `tests/plugins/*.test.ts`        | Low  | None       |

**Validation:** Coverage reports, 30+ new tests.

### Phase 5: Polish (Day 8)

**Goal:** DX improvements

| Item                  | Files         | Risk | Depends On |
| --------------------- | ------------- | ---- | ---------- |
| 4.4 Error context     | `errors/*.ts` | Low  | None       |
| 4.6 Architecture docs | `docs/*.md`   | None | All        |

---

## 8. Anti-Patterns to Avoid

### 1. Circular Dependencies

The current architecture avoids circular dependencies. When splitting types:

```
GOOD: types/container.ts <- types/utilities.ts
BAD:  types/container.ts <-> types/utilities.ts (circular)
```

Check with: `madge --circular src/types/`

### 2. Breaking Symbol Encapsulation

Internal state access uses symbols. Keep them internal:

```typescript
// GOOD: Symbol access on internal types
export interface InternalContainerMethods {
  [INTERNAL_ACCESS]: () => ContainerInternalState;
}

// BAD: Symbol access exposed on public Container type
export type Container = {
  [INTERNAL_ACCESS]: ...;  // Don't expose in public docs
};
```

### 3. Type Cast Workarounds

The project prohibits type casts. When integrating:

```typescript
// BAD: Casting to work around type issues
const result = overrides as OverrideFactoryMap;

// GOOD: Runtime type narrowing
if (typeof arg1 === "function") {
  // Builder pattern
} else {
  // Record pattern
}
```

### 4. Leaking Implementation Details

Keep internal modules internal:

```typescript
// BAD: Exporting internal implementation
export { LifecycleManager } from "./internal/lifecycle-manager.js";

// GOOD: Export only through controlled interface
export type { Disposable } from "./internal-types.js";
```

---

## 9. File Change Summary

### New Files

| File                                | Purpose                  | Improvement |
| ----------------------------------- | ------------------------ | ----------- |
| `src/container/wrapper-utils.ts`    | Shared wrapper utilities | 3.1         |
| `src/container/override-builder.ts` | Type-safe override API   | 3.2         |
| `src/types/index.ts`                | Type barrel export       | 3.4         |
| `src/types/container.ts`            | Container types          | 3.4         |
| `src/types/scope.ts`                | Scope types              | 3.4         |
| `src/types/lazy-container.ts`       | LazyContainer types      | 3.4         |
| `src/types/utilities.ts`            | Type utilities           | 3.4         |
| `src/types/inheritance.ts`          | Inheritance types        | 3.4         |
| `src/types/options.ts`              | Options types            | 3.4         |
| `tests/resolution-hooks.test.ts`    | Hook tests               | 3.3         |
| `tests/hooks-composition.test.ts`   | Composition tests        | 3.3         |

### Modified Files

| File                                          | Changes                       | Improvement |
| --------------------------------------------- | ----------------------------- | ----------- |
| `src/container/factory.ts`                    | Import from wrapper-utils     | 3.1         |
| `src/container/wrappers.ts`                   | Import from wrapper-utils     | 3.1         |
| `src/container/base-impl.ts`                  | Builder-pattern withOverrides | 3.2         |
| `src/types.ts`                                | Re-export from types/         | 3.4         |
| `src/inspection/index.ts`                     | Remove duplicate exports      | 3.5         |
| `src/container/internal/lifecycle-manager.ts` | Map-based child tracking      | 4.1         |
| `src/container/internal-types.ts`             | Add name to DisposableChild   | 4.1         |

### Unchanged Files (Key Stability Points)

| File                          | Reason                            |
| ----------------------------- | --------------------------------- |
| `src/container/impl.ts`       | Just re-exports, no logic         |
| `src/container/root-impl.ts`  | No improvements target this       |
| `src/container/child-impl.ts` | No improvements target this       |
| `src/resolution/engine.ts`    | Core resolution unchanged         |
| `src/util/memo-map.ts`        | Only minor timestamp optimization |

---

## 10. Integration Checklist

Before implementing each improvement:

- [ ] Verify no circular dependencies introduced
- [ ] Maintain backward compatibility (deprecated overloads OK)
- [ ] No `any` types or type casts
- [ ] All existing 420+ tests pass
- [ ] New functionality has tests
- [ ] JSDoc updated for changed APIs
- [ ] Internal modules remain internal (`@internal` tag)

---

## Sources

- **Codebase Analysis:** Direct inspection of `/packages/runtime/src/`
- **Improvement Spec:** `/docs/improvements/runtime-package-improvement-spec.md`
- **Existing Types:** `/packages/runtime/src/types.ts` (1,271 lines analyzed)
- **Current Wrappers:** `factory.ts` (804 lines), `wrappers.ts` (565 lines)

**Confidence:** HIGH - Based on direct code analysis of existing implementation with line-level references.
