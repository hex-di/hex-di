# Phase 12: API Cleanup - Research

**Researched:** 2026-02-02
**Domain:** TypeScript API deprecation and method removal
**Confidence:** HIGH

## Summary

Phase 12 removes four deprecated GraphBuilder methods (`provideAsync()`, `provideFirstError()`, `provideUnchecked()`, `mergeWith()`) and renames one method (`withUnsafeDepthOverride()` to `withExtendedDepth()`). This is a pure code removal phase with no new features - the replacement functionality already exists in the unified `provide()` and `merge()` methods from Phase 11.

The async detection mechanism referenced in the spec (using `IsAsyncFactory<T>` to detect Promise return types) was implemented in Phase 10 (async-lifetime-enforcement) and is already operational. The unified `createAdapter()` API from Phase 11 automatically handles async detection via type-level inference.

**Primary recommendation:** Remove deprecated methods from GraphBuilder class and type exports, then fix compile errors in tests by mechanical replacement (provideAsync → provide, mergeWith → merge, withUnsafeDepthOverride → withExtendedDepth). Standard TypeScript "property does not exist" errors provide sufficient migration guidance.

## Standard Stack

This is an internal refactoring phase with no external dependencies. All work occurs within the existing monorepo structure.

### Core Tools

| Tool       | Version | Purpose                       | Why Standard                                                   |
| ---------- | ------- | ----------------------------- | -------------------------------------------------------------- |
| TypeScript | 5.6.0   | Type system enforcement       | Project uses TS 5.6, compiler provides "does not exist" errors |
| pnpm       | 9.15.0  | Monorepo workspace management | Project uses pnpm workspaces                                   |
| Vitest     | 4.0.16  | Test runner for validation    | Project standard test framework                                |

### Validation Commands

```bash
pnpm typecheck     # Parallel type checking across packages
pnpm test:types    # Type-level test validation
pnpm test          # Runtime test validation
pnpm lint          # ESLint validation
```

## Architecture Patterns

### Pattern 1: Method Removal via Simple Deletion

**What:** Remove method declarations and type exports completely
**When to use:** When replacement functionality already exists
**Why:** TypeScript compiler errors guide users to correct API

**Locations to update:**

```
packages/graph/src/builder/builder.ts
├── Line 586: provideFirstError() method
├── Line 599: provideUnchecked() method
├── Line 612: provideAsync() method
├── Line 192: withUnsafeDepthOverride() factory method
├── Line 528: withUnsafeDepthOverride() static method
└── Line 683: mergeWith() method

packages/graph/src/builder/types/index.ts
├── ProvideAsyncResult type
├── ProvideUncheckedResult type
├── MergeWithResult type
└── (ProvideResultAllErrors unchanged, ProvideResult removed but not part of this phase)

packages/graph/src/builder/builder.ts (exports)
└── Line 98: Remove ProvideUncheckedResult export
└── Line 102: Remove MergeWithResult export
```

### Pattern 2: Method Rename via Direct Replacement

**What:** Rename method definition and update all call sites
**When to use:** When method name needs improvement but functionality stays identical
**Why:** Better naming without behavioral changes

**Steps:**

1. Rename method in class definition: `withUnsafeDepthOverride` → `withExtendedDepth`
2. Rename in factory interface return type
3. Update all call sites (tests, documentation)
4. Update type exports if any

### Pattern 3: Test Migration by Package

**What:** Organize test file updates by package (@hex-di/graph first, then others)
**When to use:** When tests span multiple packages with dependency relationships
**Why:** Fixes propagate cleanly from leaf to consumer packages

**Migration order:**

```
1. packages/graph/tests/**/*.test.ts (63 usages)
2. packages/runtime/tests/**/*.test.ts
3. packages/react/tests/**/*.test.tsx
4. packages/flow/tests/**/*.test.ts
5. packages/hono/tests/**/*.test.ts
6. examples/**/*.ts (3 usages)
```

### Anti-Patterns to Avoid

- **Deprecation period with re-exports:** User decided "clean removal" - no transitional shims
- **Custom error messages:** Standard TypeScript "property does not exist" error is sufficient
- **Aliasing old names:** No `withUnsafeDepthOverride = withExtendedDepth` period - direct rename

## Don't Hand-Roll

| Problem                       | Don't Build                             | Use Instead                               | Why                                           |
| ----------------------------- | --------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| Method deprecation warnings   | Custom deprecation system with warnings | TypeScript compiler errors                | Built-in, no maintenance burden               |
| AST-based code transformation | Custom script to rewrite test files     | Manual find-replace + compiler validation | Only 63 test file changes, manual is reliable |
| Test migration validation     | Custom test result comparison           | Standard `pnpm test` after each package   | Existing test suite validates correctness     |

**Key insight:** TypeScript's type system already provides excellent migration guidance through compile errors. Adding custom tooling would complicate a straightforward removal task.

## Common Pitfalls

### Pitfall 1: Incomplete Type Export Cleanup

**What goes wrong:** Remove methods but forget to remove type exports, leaving orphaned types
**Why it happens:** Type exports scattered across multiple files (builder.ts, types/index.ts)
**How to avoid:** Grep for type names after removal to verify no exports remain
**Warning signs:** Build succeeds but unused type warnings in IDE

**Verification command:**

```bash
grep -r "ProvideAsyncResult\|ProvideUncheckedResult\|MergeWithResult" packages/graph/src --include="*.ts"
```

### Pitfall 2: Breaking Re-exported Types in Consumer Packages

**What goes wrong:** Other packages re-export deprecated types, causing downstream breaks
**Why it happens:** `@hex-di/core` or `@hex-di/runtime` might re-export graph types
**How to avoid:** Check all package index.ts files for re-exports before removal
**Warning signs:** Graph package builds, but runtime or react packages fail

**Verification command:**

```bash
grep -r "ProvideAsync\|ProvideUnchecked\|MergeWith" packages/*/src/index.ts
```

### Pitfall 3: Async Detection Already Implemented Confusion

**What goes wrong:** Attempting to implement `IsAsyncFactory<T>` type, but it already exists
**Why it happens:** Spec mentions async detection as if it's part of this phase
**How to avoid:** Verify Phase 10 completion - async detection is done
**Warning signs:** Duplicate type definitions causing conflicts

**Verification:** `IsAsyncFactory<T>` exists in `packages/core/src/adapters/unified-types.ts` (lines 85-101)

### Pitfall 4: Factory Interface Method Not Updated

**What goes wrong:** Rename `withUnsafeDepthOverride()` on class but forget factory interface
**Why it happens:** Method exists in both `GraphBuilder` class and `GraphBuilderFactory` interface
**How to avoid:** Search for ALL occurrences of method name, not just class methods
**Warning signs:** Factory-created builders fail with "does not exist" error

**All locations for `withUnsafeDepthOverride`:**

- Line 192: `GraphBuilderFactory` interface method
- Line 528: Static method on `GraphBuilder` class
- Type `UnsafeDepthOverrideFactory` (line 219) - rename to `ExtendedDepthFactory`

## Code Examples

Verified patterns from current codebase:

### Removing a Method (Before/After)

```typescript
// BEFORE: packages/graph/src/builder/builder.ts:612-620
provideAsync<A extends AdapterConstraint & { readonly factoryKind: "async" }>(
  adapter: A
): ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
provideAsync<A extends AdapterConstraint & { readonly factoryKind: "async" }>(
  adapter: A
): unknown {
  const state = addAdapter(this, adapter);
  return GraphBuilder.fromState(state);
}

// AFTER: Delete entire method declaration and implementation
// (deleted lines 612-620)
```

### Renaming a Method (Before/After)

```typescript
// BEFORE: packages/graph/src/builder/builder.ts:192
withUnsafeDepthOverride(): GraphBuilderFactory<TMaxDepth, true>;

// AFTER: Direct rename
withExtendedDepth(): GraphBuilderFactory<TMaxDepth, true>;
```

### Test Migration Pattern

```typescript
// BEFORE: packages/graph/tests/async-adapter.test.ts
const builder = GraphBuilder.create().provide(SyncLogger).provideAsync(AsyncDatabase);

// AFTER: Mechanical replacement
const builder = GraphBuilder.create().provide(SyncLogger).provide(AsyncDatabase); // Auto-detects async from return type
```

### Factory Type Rename

```typescript
// BEFORE: packages/graph/src/builder/builder.ts:219
export type UnsafeDepthOverrideFactory = GraphBuilderFactory<DefaultMaxDepth, true>;

// AFTER: Rename type
export type ExtendedDepthFactory = GraphBuilderFactory<DefaultMaxDepth, true>;
```

## State of the Art

| Old Approach                                         | Current Approach                                    | When Changed                          | Impact                                    |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| Separate `provideAsync()` method                     | Unified `provide()` with type-level async detection | Phase 10 (async-lifetime-enforcement) | Removed cognitive load of choosing method |
| First-error-only reporting via `provideFirstError()` | All-errors reporting via `provide()`                | Phase 11 (unified adapter API)        | Better DX showing all issues at once      |
| Escape hatch via `provideUnchecked()`                | No unchecked mode                                   | Phase 11                              | Forces proper type safety                 |
| Configurable merge depth via `mergeWith()`           | Always max depth via `merge()`                      | Implicit in design                    | Simpler mental model                      |
| Scary naming `withUnsafeDepthOverride()`             | Clear intent `withExtendedDepth()`                  | This phase                            | Reduces hesitation to use when legitimate |

**Deprecated/outdated:**

- `provideAsync()`: Replaced by auto-detection in unified `provide()`
- `provideFirstError()`: Replaced by all-errors `provide()`
- `provideUnchecked()`: No replacement - removed entirely as escape hatch
- `mergeWith()`: Replaced by simpler `merge()` (always uses max depth)
- `withUnsafeDepthOverride()`: Same functionality as `withExtendedDepth()`, just better name

## Open Questions

### 1. Should `ProvideResult` (first-error) type be removed?

**What we know:** `provideFirstError()` method is being removed, but `ProvideResult` type might be used internally
**What's unclear:** Whether type-level validation still uses first-error semantics anywhere
**Recommendation:** Check for `ProvideResult` usage in types/provide.ts. If only used by `provideFirstError()`, remove it. If used by internal validation, keep it.

### 2. Runtime validation of async factories

**What we know:** Type-level async detection works via `IsAsyncFactory<T>` checking Promise return type
**What's unclear:** Whether runtime validation should confirm factoryKind matches actual Promise return
**Recommendation:** Not part of this phase - accept whatever Phase 10/11 implemented. This is pure API removal.

### 3. Documentation update scope

**What we know:** README, migration guides, and JSDoc comments will reference removed methods
**What's unclear:** Whether documentation updates are in scope for this phase or separate docs phase
**Recommendation:** Update JSDoc on affected methods, but defer comprehensive docs to separate phase (likely Phase 8 from spec).

## Sources

### Primary (HIGH confidence)

- Source code inspection: `packages/graph/src/builder/builder.ts` (current method implementations)
- Source code inspection: `packages/core/src/adapters/unified-types.ts:85-101` (`IsAsyncFactory` implementation from Phase 10)
- Project specs: `docs/improvements/graph-builder.md` (authoritative API design)
- Phase context: `.planning/phases/12-api-cleanup/12-CONTEXT.md` (user decisions)

### Secondary (MEDIUM confidence)

- Test survey: 63 test usages of deprecated methods (grep results)
- Package structure: `package.json` scripts for validation workflow

### Tertiary (LOW confidence)

- None - all findings verified with codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - No external dependencies, using project's existing toolchain
- Architecture: HIGH - Simple deletion with TypeScript compiler validation
- Pitfalls: HIGH - Identified from code inspection and grep surveys

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days - stable TypeScript ecosystem)
