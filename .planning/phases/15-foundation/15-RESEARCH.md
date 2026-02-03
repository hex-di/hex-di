# Phase 15: Foundation - Research

**Researched:** 2026-02-03
**Domain:** TypeScript codebase reorganization and API consolidation
**Confidence:** HIGH

## Summary

This phase involves internal code reorganization of the `@hex-di/runtime` package. The research domain is the existing codebase itself, not external libraries. The decisions from CONTEXT.md are locked: split types.ts (~1,271 lines) into granular files (~200 lines each), consolidate tracing/inspection into core runtime (removing HOOKS_ACCESS plugin system), and create standalone `inspect(container)` / `trace(container, fn)` functions exported from the main package.

The primary challenges are: (1) splitting the monolithic types.ts file without creating circular dependencies, (2) removing the HOOKS_ACCESS symbol-based plugin system while preserving hook functionality via public API methods, and (3) extracting the duplicated wrapper logic found in factory.ts (~804 lines) and wrappers.ts (~564 lines).

**Primary recommendation:** Split types.ts by entity (Container, Scope, LazyContainer, utility types), extract shared wrapper logic to a dedicated module, and convert `container.inspector`/`container.tracer` to standalone `inspect()`/`trace()` functions while removing HOOKS_ACCESS.

## Standard Stack

This phase requires no new libraries - it's pure internal reorganization.

### Core

| Library         | Version   | Purpose        | Why Standard              |
| --------------- | --------- | -------------- | ------------------------- |
| TypeScript      | existing  | Type system    | Already in use            |
| @hex-di/runtime | workspace | Target package | Package being reorganized |

### Supporting

None - this is internal refactoring.

### Alternatives Considered

None - decisions are locked in CONTEXT.md.

## Architecture Patterns

### Recommended Project Structure

Based on decisions in CONTEXT.md, the target structure for types/ subdirectory:

```
packages/runtime/src/
├── types/
│   ├── index.ts              # Central re-exports only
│   ├── container.ts          # Container, ContainerMembers, ContainerPhase (~200 LOC)
│   ├── scope.ts              # Scope, ScopeMembers (~150 LOC)
│   ├── lazy-container.ts     # LazyContainer, LazyContainerMembers (~150 LOC)
│   ├── options.ts            # CreateContainerOptions, CreateChildOptions, DevToolsOptions (~100 LOC)
│   ├── inheritance.ts        # InheritanceMode, InheritanceModeConfig, InheritanceModeMap (~100 LOC)
│   ├── brands.ts             # ContainerBrand, ScopeBrand symbols (~50 LOC)
│   ├── inference.ts          # Infer*, Is*, ServiceFrom* utility types (~200 LOC)
│   ├── branded-types.ts      # ContextVariableKey (existing, ~100 LOC)
│   ├── helpers.ts            # getContextVariable, setContextVariable (existing, ~170 LOC)
│   └── type-guards.ts        # isPort, isPortNamed (existing, ~80 LOC)
├── inspect.ts                # New: inspect(container) standalone function
├── trace.ts                  # New: trace(container, fn) standalone function
└── container/
    └── wrapper-utils.ts      # New: extracted shared wrapper logic
```

### Pattern 1: Entity-Based Type File Splitting

**What:** Split large type files by the primary entity they define, keeping type guards with their types.

**When to use:** When a single file exceeds ~200 lines with multiple distinct entities.

**Example:**

```typescript
// types/container.ts - Container type and related members
import type { Port, InferService } from "@hex-di/core";
import type { ContainerPhase } from "./options.js";
import type { CreateChildOptions } from "./options.js";
import { ContainerBrand } from "./brands.js";

export type Container<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
> = ContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>;

// ... ContainerMembers definition
```

### Pattern 2: Standalone Functions for Inspection/Tracing

**What:** Replace `container.inspector.getSnapshot()` with `inspect(container)` as a standalone function.

**When to use:** When consolidating plugin-like functionality into core runtime.

**Example (decided API from CONTEXT.md):**

```typescript
// inspect.ts
import type { Container } from "./types/index.js";
import { INTERNAL_ACCESS } from "./inspection/symbols.js";

/**
 * Inspect container state. Returns a full snapshot including:
 * - All adapters
 * - All cached instances
 * - Scope tree
 * - Lifetime information
 */
export function inspect<TProvides extends Port<unknown, string>>(
  container: Container<TProvides, Port<unknown, string>, Port<unknown, string>, ContainerPhase>
): ContainerSnapshot {
  const state = container[INTERNAL_ACCESS]();
  return buildSnapshot(state);
}
```

```typescript
// trace.ts
import type { Container } from "./types/index.js";

/**
 * Trace resolution within a scoped callback.
 * All resolutions within the callback are traced and returned.
 */
export function trace<TProvides extends Port<unknown, string>, R>(
  container: Container<TProvides, Port<unknown, string>, Port<unknown, string>, ContainerPhase>,
  fn: () => R
): { result: R; traces: TraceEntry[] } {
  // Install temporary hooks, run function, collect traces
}

/**
 * Enable global tracing for a container.
 * Returns a function to disable tracing.
 */
export function enableTracing<TProvides extends Port<unknown, string>>(
  container: Container<TProvides, Port<unknown, string>, Port<unknown, string>, ContainerPhase>
): () => void {
  // Use public addHook API (per CONTEXT.md decisions)
}
```

### Pattern 3: Public Hook API (Remove HOOKS_ACCESS)

**What:** Replace symbol-based `container[HOOKS_ACCESS]()` with public `container.addHook()` / `container.removeHook()` methods.

**When to use:** When converting internal plugin APIs to public-facing methods.

**Example (decided API from CONTEXT.md):**

```typescript
// On Container type:
addHook(
  type: 'beforeResolve' | 'afterResolve',
  handler: (context: ResolutionHookContext) => void
): void;

removeHook(
  type: 'beforeResolve' | 'afterResolve',
  handler: (context: ResolutionHookContext) => void
): void;

// Rich context (per CONTEXT.md):
interface ResolutionHookContext {
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly duration: number;        // After resolution
  readonly depth: number;           // Resolution depth
  readonly parentPort: Port | null; // Parent in dependency chain
  readonly containerId: string;
}
```

### Pattern 4: Circular Dependency Prevention in Type Files

**What:** Structure type file imports to form a DAG (directed acyclic graph).

**When to use:** When splitting types.ts into multiple files.

**Example - Import Hierarchy:**

```
brands.ts         <- No imports from other type files (leaf)
options.ts        <- imports from brands.ts only
inheritance.ts    <- imports from brands.ts only
container.ts      <- imports from brands.ts, options.ts, inheritance.ts
scope.ts          <- imports from brands.ts, options.ts
lazy-container.ts <- imports from container.ts, brands.ts
inference.ts      <- imports from container.ts, scope.ts (utility types)
index.ts          <- re-exports all (no logic)
```

### Anti-Patterns to Avoid

- **Circular imports between type files:** Will cause TypeScript compilation errors or runtime issues. Structure imports as DAG.
- **Giant index.ts with logic:** Index should only re-export, not define types.
- **Type guards in separate files from types:** Type guards should stay with their types (per CONTEXT.md decisions).
- **Keeping HOOKS_ACCESS symbol:** Must be removed per CONTEXT.md - use public API instead.

## Don't Hand-Roll

This phase is internal refactoring - no external solutions needed.

| Problem                       | Don't Build       | Use Instead                                 | Why                                 |
| ----------------------------- | ----------------- | ------------------------------------------- | ----------------------------------- |
| Type splitting                | Manual copy-paste | Extract file, update imports, run typecheck | TypeScript will catch import errors |
| Circular dependency detection | Custom analysis   | `madge` or manual DAG planning              | Well-understood problem             |

**Key insight:** This is pure TypeScript refactoring. The "solution" is careful planning of import hierarchy, not external tools.

## Common Pitfalls

### Pitfall 1: Breaking External API

**What goes wrong:** Changing export structure breaks consumers importing from '@hex-di/runtime'.
**Why it happens:** Forgetting to update index.ts re-exports after file splits.
**How to avoid:**

1. Keep all existing exports in index.ts
2. Run type tests after each change
3. Verify examples still compile
   **Warning signs:** TypeScript errors in other packages or examples.

### Pitfall 2: Circular Dependencies in Type Files

**What goes wrong:** TypeScript compilation fails or produces unexpected `undefined` at runtime.
**Why it happens:** Two type files importing from each other.
**How to avoid:**

1. Plan import DAG before splitting
2. Put shared types in "leaf" files (brands.ts, options.ts)
3. Higher-level types import from lower-level only
   **Warning signs:** "Cannot access 'X' before initialization" errors.

### Pitfall 3: Forgetting Internal vs Public Type Separation

**What goes wrong:** Internal implementation types leak into public API.
**Why it happens:** Moving types without considering visibility.
**How to avoid:**

1. Mark internal types with `@internal` JSDoc
2. Don't export internal types from index.ts
3. Internal types can stay in implementation files
   **Warning signs:** Types appearing in public API docs that shouldn't.

### Pitfall 4: Breaking Hook Installation During Plugin Removal

**What goes wrong:** Existing hook functionality stops working after removing HOOKS_ACCESS.
**Why it happens:** Removing symbol access without adding public API methods.
**How to avoid:**

1. Add public `addHook`/`removeHook` methods FIRST
2. Migrate internal callers to public API
3. THEN remove HOOKS_ACCESS symbol
   **Warning signs:** Tracing tests failing, hooks not firing.

### Pitfall 5: Wrapper Code Duplication

**What goes wrong:** Bug fixes need to be applied in multiple places.
**Why it happens:** factory.ts and wrappers.ts have duplicate `attachBuiltinAPIs`, `createChildFromGraph` logic.
**How to avoid:**

1. Extract shared logic to wrapper-utils.ts
2. Both factory.ts and wrappers.ts import from shared module
3. Pattern: Higher-level files compose from utilities
   **Warning signs:** Same code appearing in multiple files (current state).

## Code Examples

Verified patterns from the existing codebase analysis.

### Current Type File Structure (to be split)

```typescript
// Current: types.ts (1,271 lines) contains ALL of:
// - ContainerPhase
// - ContainerKind
// - ContainerDevToolsOptions
// - CreateContainerOptions
// - CreateChildOptions
// - ContainerBrand, ScopeBrand (symbols)
// - Container type (400+ lines with JSDoc)
// - ContainerMembers
// - Scope type
// - ScopeMembers
// - InheritanceMode types
// - LazyContainer type
// - LazyContainerMembers
// - InferContainerProvides, InferScopeProvides
// - IsResolvable, ServiceFromContainer
// - IsRootContainer, IsChildContainer
```

### Current Duplication in Factory/Wrappers

```typescript
// Duplicated in factory.ts (lines 78-98) and wrappers.ts (lines 72-92):
function attachBuiltinAPIs(
  container: AttachableContainer
): asserts container is ContainerWithBuiltinAPIs {
  const inspectorAPI = createBuiltinInspectorAPI(container);
  Object.defineProperty(container, "inspector", {
    value: inspectorAPI,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  // ... tracer attachment
}
```

### Current HOOKS_ACCESS Pattern (to be replaced)

```typescript
// Current (inspection/symbols.ts line 130):
export const HOOKS_ACCESS = Symbol.for("hex-di/hooks-access");

// Current usage in wrappers.ts (line 358):
Object.defineProperty(childContainer, HOOKS_ACCESS, {
  value: () => hooksInstaller,
  writable: false,
  enumerable: false,
  configurable: false,
});

// Target (per CONTEXT.md): Public API
container.addHook("beforeResolve", ctx => console.log(ctx.portName));
container.removeHook("beforeResolve", handler);
```

### Target inspect() Function

```typescript
// New standalone function (per CONTEXT.md decisions):
import { INTERNAL_ACCESS } from "./inspection/symbols.js";

export function inspect<TProvides extends Port<unknown, string>>(
  container: HasInternalAccess
): ContainerSnapshot {
  const state = container[INTERNAL_ACCESS]();
  return {
    adapters: Array.from(state.adapterMap.entries()),
    instances: Array.from(state.singletonMemo.entries()),
    scopes: buildScopeTree(state.childScopes),
    lifetimes: extractLifetimes(state.adapterMap),
  };
}
```

## State of the Art

| Old Approach                        | Current Approach                    | When Changed | Impact          |
| ----------------------------------- | ----------------------------------- | ------------ | --------------- |
| `container.inspector.getSnapshot()` | `inspect(container)`                | This phase   | Simpler API     |
| `container.tracer.getTraces()`      | `trace(container, fn)`              | This phase   | Scoped tracing  |
| `container[HOOKS_ACCESS]()`         | `container.addHook()`               | This phase   | Public API      |
| Single types.ts (1,271 LOC)         | types/ subdirectory (~200 LOC each) | This phase   | Maintainability |

**Deprecated/outdated after this phase:**

- HOOKS_ACCESS symbol: Replaced by public addHook/removeHook methods
- createInspector factory: Replaced by inspect() standalone function
- createTracer factory: Replaced by trace() standalone function
- CaptiveDependencyErrorLegacy export: Removed per API-05

## Open Questions

Things at Claude's discretion per CONTEXT.md:

1. **Internal vs Public Type Separation**
   - What we know: Some types (ContainerMembers, ScopeMembers) are marked @internal
   - What's unclear: Should they be in separate files or just not re-exported from index.ts?
   - Recommendation: Keep in same entity file, use @internal JSDoc, don't export from index.ts

2. **Cache Hit Behavior for Hooks**
   - What we know: beforeResolve/afterResolve can fire for cache hits or only first resolution
   - What's unclear: Which behavior is expected/useful?
   - Recommendation: Fire always (including cache hits) - more useful for tracing

3. **Hook Error Handling**
   - What we know: Hooks could throw errors
   - What's unclear: Propagate to caller or catch and log?
   - Recommendation: Propagate - hooks are user code, errors should surface

4. **Export Type Syntax**
   - What we know: Can use `export type { X }` or `export { X }`
   - What's unclear: Project convention?
   - Recommendation: Use `export type` for type-only exports (matches existing pattern)

## Sources

### Primary (HIGH confidence)

- Existing codebase analysis (all findings based on actual file contents)
- CONTEXT.md decisions (locked user decisions)

### Secondary (MEDIUM confidence)

- None - no external research needed

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**

- Types file split: HIGH - Based on actual file analysis and CONTEXT.md decisions
- Plugin removal: HIGH - CONTEXT.md explicitly defines target API
- Wrapper extraction: HIGH - Duplication clearly visible in codebase
- Hook behavior decisions: MEDIUM - At Claude's discretion per CONTEXT.md

**Research date:** 2026-02-03
**Valid until:** Indefinitely (internal refactoring, no external dependencies)
