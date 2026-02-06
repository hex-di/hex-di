# Phase 26: Breaking Change Migration - Research

**Researched:** 2026-02-06
**Domain:** Large-scale breaking change migration in TypeScript monorepo
**Confidence:** HIGH

## Summary

Phase 26 involves removing the old tracing system (TraceCollector, TracingAPI, ResolutionSpan, MemoryCollector, NoOpCollector, CompositeCollector) and replacing all references with the new @hex-di/tracing system (Phases 23-25). This is a HIGH-risk breaking change affecting 6 packages, 3 integration packages, and multiple examples.

The migration follows a clear dependency order: core types first, then runtime exports, then integrations, then examples. The key challenge is ensuring zero breakage across the monorepo after removal - all tests and typechecks must pass.

**Primary recommendation:** Use a bottom-up deletion strategy with continuous type-checking after each removal. Delete source files first, then fix TypeScript errors in consuming code, then update tests, then verify the full monorepo builds clean.

## Standard Stack

This phase uses the existing monorepo toolchain - no new dependencies required.

### Core Tools

| Tool            | Version | Purpose                       | Why Standard                                    |
| --------------- | ------- | ----------------------------- | ----------------------------------------------- |
| pnpm workspaces | 9.x     | Monorepo package management   | Already configured, supports recursive commands |
| TypeScript      | 5.x     | Type-checking across packages | Catches breaking changes at compile time        |
| Vitest          | 2.x     | Test suite execution          | Existing test infrastructure                    |

### Migration Pattern

The standard approach for breaking changes in this codebase:

1. **No backward compatibility** - Project rules explicitly forbid compatibility shims
2. **Break and change freely** - Remove deprecated code immediately, no gradual deprecation
3. **Type-check driven** - Let TypeScript errors guide the migration path
4. **Test-driven verification** - All tests must pass after migration

**Installation:**

```bash
# No new dependencies - uses existing monorepo tooling
pnpm install  # Ensure all packages linked
```

## Architecture Patterns

### Dependency Order for Deletion

The codebase has a clear package dependency hierarchy:

```
@hex-di/core (foundation - zero dependencies)
    ↓
@hex-di/runtime (depends on core)
    ↓
@hex-di/react, @hex-di/hono (depend on runtime + core)
    ↓
examples/* (depend on integrations + runtime + core)
```

**Critical insight:** Delete from the bottom up to minimize cascading TypeScript errors.

### Pattern 1: Bottom-Up Source Deletion

**What:** Remove implementation files from deepest dependency first
**When to use:** When removing types/APIs that cascade through multiple packages
**Order:**

1. Delete from `packages/core/src/collectors/*` and `packages/core/src/span/*`
2. Remove re-exports from `packages/core/src/index.ts`
3. Delete from `packages/runtime/src/tracing/*` re-exports
4. Remove runtime API exports (`trace.ts`, container tracer property)
5. Fix integration packages (`@hex-di/react`, `@hex-di/hono`)
6. Update examples

**Example deletion sequence:**

```bash
# Step 1: Remove core implementations
rm -rf packages/core/src/collectors/
rm -rf packages/core/src/span/

# Step 2: Remove core exports
# Edit packages/core/src/index.ts - remove collector/span exports

# Step 3: Remove runtime re-exports and old APIs
# Edit packages/runtime/src/tracing/index.ts - remove re-exports
rm packages/runtime/src/trace.ts
# Edit packages/runtime/src/index.ts - remove trace/enableTracing exports

# Step 4: Fix type errors in container implementation
# Edit packages/runtime/src/types/container.ts - remove TracingAPI property

# Step 5: Fix integrations (handled by TypeScript errors)
# Step 6: Fix examples (handled by TypeScript errors)
```

### Pattern 2: Continuous Type-Check Validation

**What:** Run `pnpm -r typecheck` after each major deletion to catch cascading errors
**When to use:** After removing each major API surface (collectors, span types, runtime APIs)
**Why:** TypeScript will identify every usage site that needs updating

**Example workflow:**

```bash
# Delete old collectors from core
rm -rf packages/core/src/collectors/
pnpm -r typecheck 2>&1 | tee typecheck-errors.txt

# Analyze errors, fix imports, repeat
# Edit files to remove imports
pnpm -r typecheck  # Verify fixes

# Continue to next deletion
```

### Pattern 3: Test-After-Fix Strategy

**What:** Fix TypeScript errors first, then run tests to verify behavior
**When to use:** When breaking changes affect test imports but not test logic
**Why:** Tests often import old types - fix imports first, then verify tests still pass

**Example:**

```typescript
// OLD: Test imports old tracing types
import { MemoryCollector } from "@hex-di/runtime";

// NEW: Test uses new tracing system
import { MemoryTracerAdapter } from "@hex-di/tracing";
```

### Pattern 4: Grep-Guided Migration

**What:** Use grep to find all references before deletion
**When to use:** To build a complete inventory of what needs updating
**Why:** Prevents surprises after deletion

**Example:**

```bash
# Find all references to old APIs
grep -r "TraceCollector\|TracingAPI\|ResolutionSpan" packages/ integrations/ examples/ --include="*.ts" --include="*.tsx"

# Find container.tracer usage
grep -r "container\.tracer\." packages/ integrations/ examples/ --include="*.ts" --include="*.tsx"

# Find trace() and enableTracing() calls
grep -r "trace(\|enableTracing(" packages/ integrations/ examples/ --include="*.ts" --include="*.tsx"
```

### Anti-Patterns to Avoid

- **Attempting parallel changes** - Don't try to update all packages simultaneously. Follow dependency order.
- **Leaving commented-out code** - Project rules forbid keeping old code as comments. Delete completely.
- **Creating compatibility wrappers** - Project rules explicitly forbid backward compatibility shims.
- **Ignoring test failures** - All tests must pass. Don't merge with failing tests.
- **Using type casts to silence errors** - Project rules forbid `as` casts. Fix the underlying type issue.

## Don't Hand-Roll

| Problem                       | Don't Build                       | Use Instead                        | Why                                                          |
| ----------------------------- | --------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Finding all type references   | Manual file-by-file search        | `pnpm -r typecheck` output         | TypeScript will find every usage site automatically          |
| Migration compatibility layer | Re-export wrappers, adapters      | Direct deletion and fix            | Project rules forbid compatibility shims                     |
| Test update automation        | Custom AST transformation scripts | Manual fix guided by test failures | Small number of files (~50 files), manual is safer           |
| Dependency ordering           | Manual analysis                   | Existing dependency graph          | Core → Runtime → Integrations → Examples is well-established |

**Key insight:** TypeScript's compiler is the migration tool. Run typecheck frequently and let errors guide the work.

## Common Pitfalls

### Pitfall 1: Deleting Out of Order

**What goes wrong:** Deleting from runtime before core leaves orphaned re-exports that cause confusing errors
**Why it happens:** Natural instinct is to start where the API is used (runtime) rather than where it's defined (core)
**How to avoid:** Always follow the dependency graph: core → runtime → integrations → examples
**Warning signs:** Errors about missing modules in core when runtime is the file being edited

### Pitfall 2: Missing Test Imports

**What goes wrong:** Tests import old tracing types for mocking/assertions. Removing types breaks tests even when implementation is correct.
**Why it happens:** Test files are often overlooked because they're in separate `tests/` directories
**How to avoid:** After each deletion, run `pnpm -r test` to catch test-specific imports
**Warning signs:** TypeCheck passes but tests fail with import errors

### Pitfall 3: Forgetting Export Removal

**What goes wrong:** Delete implementation files but forget to remove exports from `index.ts`. TypeScript reports "module not found" errors.
**Why it happens:** Index files are barrel exports that aggregate multiple modules - easy to miss
**How to avoid:** After deleting a directory, immediately check parent `index.ts` for exports from that path
**Warning signs:** Error: "Cannot find module './collectors'" in core/src/index.ts

### Pitfall 4: Integration Package Type Drift

**What goes wrong:** Integration packages import types from `@hex-di/core` that no longer exist. Error messages are confusing because they reference workspace packages.
**Why it happens:** Workspace dependencies are symlinked, so changes in core immediately affect integrations
**How to avoid:** After fixing core/runtime, run `pnpm --filter @hex-di/react typecheck` and `pnpm --filter @hex-di/hono typecheck` separately
**Warning signs:** Errors in `integrations/react/src/*` referencing types from `@hex-di/core`

### Pitfall 5: Container.tracer Property Removal

**What goes wrong:** The `tracer: TracingAPI` property is part of Container type signature. Removing it breaks every container instantiation.
**Why it happens:** This is a runtime property, not just a type - removing it requires implementation changes
**How to avoid:**

1. Remove from type signature in `packages/runtime/src/types/container.ts`
2. Remove from container factory in `packages/runtime/src/container/factory.ts`
3. Remove from built-in API implementations
   **Warning signs:** Errors about missing `tracer` property in container.ts or factory.ts

### Pitfall 6: Pre-existing Failures

**What goes wrong:** Migration "fails" because of unrelated pre-existing lint errors or test failures
**Why it happens:** According to phase context, there are pre-existing failures:

- packages/graph: 11 lint errors, 12 warnings
- libs/flow/core: 31 lint warnings
- examples/react-showcase: 12 failing tests
  **How to avoid:**

1. Document baseline failures before starting migration
2. Only fix migration-caused failures
3. Don't expand scope to fix pre-existing issues
   **Warning signs:** Lint/test failures in files you didn't modify

## Code Examples

Verified patterns from the existing codebase:

### Old System Usage (To Be Removed)

```typescript
// OLD: packages/runtime/src/types/container.ts
export type Container<...> = {
  // ... other properties
  readonly tracer: TracingAPI;  // ← REMOVE THIS
};

// OLD: packages/runtime/src/index.ts
export { trace, enableTracing } from "./trace.js";  // ← REMOVE THIS

// OLD: packages/core/src/index.ts
export { MemoryCollector, NoOpCollector, CompositeCollector } from "./collectors/index.js";  // ← REMOVE THIS
export type { TraceCollector, ResolutionSpan } from "./collectors/index.js";  // ← REMOVE THIS
```

### New System Usage (Target State)

```typescript
// NEW: Use instrumentation from @hex-di/tracing
import { instrumentContainer, TracerPort, MemoryTracerAdapter } from "@hex-di/tracing";
import { createContainer } from "@hex-di/runtime";

const graph = GraphBuilder.create()
  .provide(MemoryTracerAdapter) // Provide tracer adapter
  .provide(LoggerAdapter)
  .build();

const container = createContainer({ graph, name: "App" });

// Instrument container for tracing
instrumentContainer(container, container.resolve(TracerPort), {
  portFilter: { include: ["*"] },
  trackTiming: true,
});

// Resolve and use services - tracing happens automatically
const logger = container.resolve(LoggerPort);
```

### Type-Safe Migration Helper

```typescript
// Pattern: Remove type without breaking dependents
// Before removal, check what's using it:
// grep -r "import.*TracingAPI" packages/ integrations/ examples/

// After removal, TypeScript will show errors at every usage site
// Fix imports file-by-file following TypeScript error messages
```

## State of the Art

| Old Approach                                  | Current Approach                                     | When Changed           | Impact                                                         |
| --------------------------------------------- | ---------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| Built-in container.tracer property            | Instrumentation via instrumentContainer()            | Phase 23-25 (Feb 2026) | Decouples tracing from container - opt-in only                 |
| TraceCollector, MemoryCollector APIs          | TracerPort, MemoryTracerAdapter from @hex-di/tracing | Phase 23 (Feb 2026)    | Standard port-adapter pattern, not special-cased               |
| trace(), enableTracing() standalone functions | instrumentContainer() with TracerPort                | Phase 24 (Feb 2026)    | Consistent with DI architecture, not ad-hoc functions          |
| ResolutionSpan types                          | Span, SpanData types from @hex-di/tracing            | Phase 23 (Feb 2026)    | W3C Trace Context compatible, standard OpenTelemetry semantics |

**Deprecated/outdated:**

- `container.tracer`: Replaced by opt-in instrumentation. Tracing is now a user-space concern, not built into container.
- `TraceCollector` interface: Replaced by `Tracer` port. Use standard DI resolution instead of special collector API.
- `trace()` / `enableTracing()`: Replaced by `instrumentContainer()`. Consistent with port-adapter pattern.

## Open Questions

Things that couldn't be fully resolved:

1. **libs/flow/core tracing integration**
   - What we know: libs/flow/core has its own `tracing/` module with FlowCollector, MemoryCollector, NoOpCollector
   - What's unclear: Do these need migration to @hex-di/tracing or are they flow-specific?
   - Recommendation: Check if flow tracers reference old DI tracing types. If independent, leave unchanged for now.

2. **Documentation updates**
   - What we know: README.md mentions "Built-in Tracing & Inspection" and "container.tracer"
   - What's unclear: How extensive are the docs that reference old tracing APIs?
   - Recommendation: Grep for documentation after code migration, update references to new instrumentation approach.

3. **Pre-existing test failures scope**
   - What we know: examples/react-showcase has 12 failing tests before migration
   - What's unclear: Are any of these related to tracing? Will migration affect them?
   - Recommendation: Run examples/react-showcase tests before migration to document baseline. Only fix new failures.

## Sources

### Primary (HIGH confidence)

- Codebase analysis: Direct inspection of packages/core/src/collectors/, packages/core/src/span/, packages/runtime/src/trace.ts
- Phase 23 VERIFICATION.md: Confirms new @hex-di/tracing package is complete with 156 passing tests
- CLAUDE.md project rules: Confirms no backward compatibility requirement, explicit deletion over deprecation policy
- packages/tracing/src/index.ts: Confirms new instrumentation API (instrumentContainer, TracerPort)

### Secondary (MEDIUM confidence)

- .planning/codebase/STRUCTURE.md: Package dependency hierarchy (core → runtime → integrations → examples)
- Grep results: 50 files reference old tracing types (TraceCollector, TracingAPI, ResolutionSpan)
- Test infrastructure: pnpm -r test and pnpm -r typecheck are monorepo-wide validation commands

### Tertiary (LOW confidence)

- None - all findings verified from primary sources

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Uses existing pnpm/TypeScript/Vitest, no new tools
- Architecture: HIGH - Dependency graph is well-established, deletion order is clear
- Pitfalls: HIGH - Based on codebase analysis and project rules, patterns are specific

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable monorepo tooling, no external dependencies)
