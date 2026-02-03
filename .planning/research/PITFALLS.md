# Domain Pitfalls: @hex-di/runtime Improvements

**Domain:** DI runtime package refactoring (v5.0)
**Researched:** 2026-02-03
**Scope:** Elevating `@hex-di/runtime` from 8.7/10 to 9.5/10

## Critical Pitfalls

Mistakes that cause rewrites, breaking changes, or data loss.

### Pitfall 1: Circular Import Cycles When Splitting types.ts

**What goes wrong:** Splitting the 1,271-line `types.ts` into 6 files introduces circular imports when Container types reference Scope types and vice versa.

**Why it happens:** The current `types.ts` contains deeply coupled types:

- `ContainerMembers` references `Scope<TProvides, TAsyncPorts, TPhase>` (line 393)
- `ScopeMembers` references no Container types but shares brand symbols
- `InferContainerProvides` and `InferScopeProvides` are used together in `IsResolvable`
- Utility types (`ExtractPortNames`, `InferServiceByName`) span both domains

**Consequences:**

- TypeScript emits "Cannot access X before initialization" runtime errors
- Circular import causes undefined symbols at runtime
- Build fails silently in some bundlers (Vite, esbuild)
- Package consumers see cryptic "X is not a function" errors

**Warning signs:**

- `npm pack` produces different file sizes than expected
- Jest/Vitest tests pass but integration tests fail
- VSCode shows types as `any` in certain files
- `tsc --declaration` produces empty or incomplete `.d.ts` files

**Prevention:**

1. **Topological ordering:** Map dependencies before splitting:
   ```
   brands.ts         → (no deps)
   container-phase.ts → (no deps)
   inheritance.ts    → (no deps)
   scope-types.ts    → brands.ts
   container-types.ts → brands.ts, scope-types.ts, inheritance.ts
   utilities.ts      → container-types.ts, scope-types.ts
   ```
2. **Type-only imports:** Use `import type` exclusively between split files
3. **Index barrel:** Re-export from single `types/index.ts` to preserve external API
4. **Integration test:** Run `npm pack && npm install ../hex-di-runtime-x.y.z.tgz` in test project
5. **No runtime dependencies between type files:** Types are compile-time only

**Detection:**

- Run `madge --circular packages/runtime/src/types/*.ts` after split
- Watch for `ReferenceError: Cannot access 'X' before initialization`
- Check `.d.ts` files have all expected exports

**Phase:** Address in Phase 1 (Type File Split)

**References:**

- `/packages/runtime/src/types.ts` (1,271 lines) - Current monolithic file
- `/packages/runtime/src/index.ts` (lines 33-71) - Current type exports

---

### Pitfall 2: Export Breakage When Consolidating Inspector APIs

**What goes wrong:** Removing "duplicate" inspector exports breaks downstream packages that import from specific paths.

**Why it happens:** Current exports span multiple locations:

- `/packages/runtime/src/index.ts` exports `createInspector` (line 146)
- `/packages/runtime/src/index.ts` exports `createInspector as createInspectorAPI` (line 156)
- `/packages/runtime/src/inspection/index.ts` re-exports same symbols
- Other packages may import from `@hex-di/runtime/inspection` (subpath export)

Removing what appears to be a duplicate actually breaks:

- `@hex-di/testing` if it imports from inspection submodule
- `@hex-di/visualization` if it depends on internal paths
- User code using deep imports

**Consequences:**

- Downstream packages fail to build after update
- Users must change import paths (breaking change)
- Monorepo CI passes but external consumers break

**Warning signs:**

- Two symbols with same name but different paths in index.ts
- Package.json `exports` field has subpath exports
- Other workspace packages import from subpaths

**Prevention:**

1. **Grep all workspaces first:**
   ```bash
   grep -r "from '@hex-di/runtime/inspection'" packages/
   grep -r "from '../runtime/src/inspection'" packages/
   ```
2. **Preserve subpath exports:** If `exports` field has subpaths, keep them
3. **Deprecation cycle:** Mark duplicates as `@deprecated` in v5.0, remove in v6.0
4. **Workspace integration test:** Build all packages after changes

**Detection:**

- `pnpm -r typecheck` fails in another package
- `exports` field in package.json has unused paths after consolidation

**Phase:** Address in Phase 2 (Export Consolidation)

**References:**

- `/packages/runtime/src/index.ts` (lines 146-173) - Inspector exports
- `/packages/runtime/package.json` (lines 7-18) - exports field

---

### Pitfall 3: Type Inference Regression with Port-Keyed Override API

**What goes wrong:** Changing `withOverrides({ Logger: () => mock })` to `withOverrides(new Map([[LoggerPort, () => mock]]))` breaks type inference for override return types.

**Why it happens:** Current string-keyed approach:

```typescript
withOverrides<
  TOverrides extends {
    [K in ExtractPortNames<TProvides>]?: () => InferServiceByName<TProvides, K>;
  },
  R,
>(overrides: TOverrides, fn: () => R): R;
```

Port-keyed approach creates inference challenges:

- Map generic parameters don't distribute over union types well
- Port → Service type mapping requires conditional types at call site
- TypeScript may infer `Map<Port<unknown, string>, () => unknown>`

**Consequences:**

- Overrides lose type checking (mock doesn't match service type)
- IDE autocomplete shows `unknown` instead of specific service
- Runtime errors when mock shape doesn't match expected interface
- Type tests that were passing start failing

**Warning signs:**

- `expectTypeOf<typeof mock>().toEqualTypeOf<Logger>()` fails
- IDE shows `() => unknown` instead of `() => Logger`
- Need to add explicit type annotation at call site

**Prevention:**

1. **Discriminated overload:**
   ```typescript
   // String-keyed (existing)
   withOverrides(overrides: { [K in ...]: ... }, fn: () => R): R;
   // Port-keyed (new)
   withOverrides<P extends TProvides>(port: P, factory: () => InferService<P>, fn: () => R): R;
   // Multi-port (builder pattern)
   override(): OverrideBuilder<TProvides>;
   ```
2. **Builder pattern instead of Map:**
   ```typescript
   container
     .override(LoggerPort, () => mockLogger)
     .override(DatabasePort, () => mockDb)
     .run(() => test());
   ```
3. **Type tests first:** Write `.test-d.ts` file before implementation
4. **Preserve backward compatibility:** Keep string-keyed API, add port-keyed as alternative

**Detection:**

- Type test shows `InferService<P>` resolving to `unknown`
- Need explicit type annotations in tests
- `expectTypeOf` tests fail for override return type

**Phase:** Address in Phase 3 (Type-Safe Override API)

**References:**

- `/packages/runtime/src/types.ts` (lines 341-352) - Current withOverrides signature
- `/packages/runtime/src/container/override-context.ts` - Override implementation
- `/packages/runtime/tests/override.test.ts` - Override test cases

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or partial functionality loss.

### Pitfall 4: Performance Regression with Map-Based Child Container Tracking

**What goes wrong:** Switching child container tracking from `Array<DisposableChild>` to `Map<string, DisposableChild>` for O(1) unregistration introduces memory overhead and GC pressure.

**Why it happens:** Current implementation in `LifecycleManager`:

```typescript
private childContainers: DisposableChild[] = [];
unregisterChildContainer(child: DisposableChild): void {
  const index = this.childContainers.indexOf(child);
  if (index !== -1) {
    this.childContainers.splice(index, 1);  // O(n)
  }
}
```

Map replacement seems straightforward but:

- Map entries require string keys (container IDs) - additional memory per container
- Map iteration order differs from Array (insertion order in ES6+, but semantics differ)
- Frequent container creation/disposal may trigger more GC than Array mutation
- Set might be better fit than Map (no values needed)

**Consequences:**

- Memory usage increases in long-running apps with many child containers
- GC pauses become more frequent
- Disposal order subtly changes (Map iteration vs Array reverse)
- Benchmark shows unexpected performance drop

**Warning signs:**

- Memory profiling shows increased heap usage
- GC events more frequent in DevTools
- Disposal tests fail due to ordering changes
- Container ID generation becomes bottleneck

**Prevention:**

1. **Use Set instead of Map:** No values needed, just membership check
   ```typescript
   private childContainers: Set<DisposableChild> = new Set();
   unregisterChildContainer(child: DisposableChild): void {
     this.childContainers.delete(child);  // O(1)
   }
   ```
2. **Benchmark before/after:** Create micro-benchmark for 1000 child container ops
3. **Preserve disposal order:** Convert Set to Array for reverse iteration during disposal
4. **Lazy initialization:** Only create Set when first child registered

**Detection:**

- `vitest bench` shows regression in container creation/disposal
- Memory snapshots show more objects per container
- Disposal order tests fail

**Phase:** Address in Phase 4 (O(1) Child Container Operations)

**References:**

- `/packages/runtime/src/container/internal/lifecycle-manager.ts` - Current implementation
- `/packages/runtime/tests/child-container.test.ts` - Child container tests
- `/packages/runtime/tests/disposal.test.ts` - Disposal ordering tests

---

### Pitfall 5: Test Brittleness from Implementation Coupling

**What goes wrong:** New tests for hooks and plugins couple tightly to internal implementation details, breaking when refactoring internals even if behavior is preserved.

**Why it happens:** Testing hooks and plugins requires accessing internal state:

- Hook tests spy on internal method calls
- Plugin tests check internal data structures
- Tests verify internal memoization details

When internals change:

- `vi.spyOn(container, 'resolveInternal')` fails if method renamed
- Tests checking `MemoMap` structure break if caching changes
- Tests depending on specific error messages break

**Consequences:**

- 45+ new tests become maintenance burden
- Simple refactoring triggers cascade of test fixes
- Tests pass but don't actually verify correct behavior
- False confidence from high test count

**Warning signs:**

- Tests use `vi.spyOn` on internal methods
- Tests access properties via `INTERNAL_ACCESS` symbol
- Tests assert on specific call counts or orderings
- Tests break when fixing unrelated bugs

**Prevention:**

1. **Behavior over implementation:** Test observable outcomes, not internal calls

   ```typescript
   // Bad: Tests implementation
   const spy = vi.spyOn(engine, 'resolveWithAdapter');
   container.resolve(LoggerPort);
   expect(spy).toHaveBeenCalledWith(LoggerPort, expect.any(Object), ...);

   // Good: Tests behavior
   const logger = container.resolve(LoggerPort);
   expect(logger).toBeInstanceOf(ConsoleLogger);
   ```

2. **Public API surface only:** Test through Container/Scope methods
3. **Integration-style hook tests:** Verify hooks affect resolution, not that they're called
4. **Snapshot for internal state:** Use `getInternalState()` for DevTools tests only

**Detection:**

- Tests break when renaming internal methods
- Test descriptions mention "should call X internally"
- Tests import from internal paths (`../src/container/internal/`)

**Phase:** Address in all test-related work (Phases 5-6)

**References:**

- `/packages/runtime/tests/` - Existing test patterns
- `/packages/testing/src/mock-adapter.ts` - Test utility patterns

---

### Pitfall 6: Builder Pattern Type Complexity with Override API

**What goes wrong:** Implementing a fluent builder pattern for type-safe overrides exhausts TypeScript's recursion depth, causing TS2589 errors.

**Why it happens:** Fluent builders accumulate type state:

```typescript
class OverrideBuilder<TProvides, TOverridden = never> {
  override<P extends Exclude<TProvides, TOverridden>>(
    port: P, factory: () => InferService<P>
  ): OverrideBuilder<TProvides, TOverridden | P> { ... }
}
```

Each `override()` call adds to `TOverridden` union:

- 10 overrides = 10-level deep type
- Type checking each call validates against all previous
- `Exclude<TProvides, TOverridden>` grows exponentially

**Consequences:**

- TS2589 "Type instantiation is excessively deep" with many overrides
- IDE becomes unresponsive when chaining override calls
- Users can't use feature for realistic scenarios (>5 overrides)

**Warning signs:**

- Type tests with 5+ chained overrides cause TS2589
- IDE hover shows "..." or "any" for builder type
- Build time increases significantly with override usage

**Prevention:**

1. **Non-accumulating type:** Reset TOverridden on terminal method
   ```typescript
   override<P>(...): OverrideBuilder<TProvides, P> // Not |
   run<R>(fn: () => R): R; // Terminal, validates all at once
   ```
2. **Separate validation:** Validate on `run()`, not on each `override()`
3. **Max override limit:** Document limit of 10 overrides in single builder
4. **Non-builder alternative:** Provide Map-based API for many overrides
5. **Type tests with realistic counts:** Test with 1, 5, 10, 20 overrides

**Detection:**

- `packages/runtime/tests/override.test-d.ts` fails with TS2589
- Type checking time >5s for override builder usage
- Builder type shows as `any` in IDE

**Phase:** Address in Phase 3 (Type-Safe Override API)

**References:**

- `/packages/graph/src/builder/types/provide.ts` - Similar accumulating pattern
- `/.planning/codebase/CONCERNS.md` (lines 154-187) - Type complexity concerns

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 7: Inconsistent File Naming After Type Split

**What goes wrong:** Split type files use inconsistent naming conventions, making navigation confusing.

**Why it happens:** No established convention for split files:

- `container-types.ts` vs `container.types.ts` vs `ContainerTypes.ts`
- `scope-members.ts` vs `scope/members.ts` vs `scopeMembers.ts`
- Mixing `kebab-case.ts`, `camelCase.ts`, and `PascalCase.ts`

**Prevention:**

1. **Follow existing convention:** Check existing src/types/ folder patterns
2. **Kebab-case files:** `container-types.ts`, `scope-types.ts`, `type-utilities.ts`
3. **Flat over nested:** Keep in single `types/` folder, don't create `types/container/`
4. **Document in CLAUDE.md:** Add file naming convention

**Phase:** Address in Phase 1 (Type File Split)

---

### Pitfall 8: Stale Internal State Snapshots After Refactoring

**What goes wrong:** `getInternalState()` returns outdated structure after refactoring internals, breaking DevTools integration.

**Why it happens:** Internal state snapshot interface is frozen but implementation changes:

```typescript
interface ContainerInternalState {
  singletonMemo: MemoMapSnapshot;
  // ... other fields
}
```

If implementation changes from `MemoMap` to different structure:

- Snapshot creation code silently produces incorrect data
- DevTools shows stale or wrong information
- No type error since snapshot interface unchanged

**Prevention:**

1. **Snapshot type derives from implementation:** Use mapped types
2. **Integration tests with DevTools:** Verify snapshot contents match actual state
3. **Document snapshot contract:** Which fields are stable vs internal

**Phase:** Address in Phase 2 (Export Consolidation)

---

### Pitfall 9: Missing Return Types After Extracting Shared Wrapper Logic

**What goes wrong:** Extracted wrapper functions lose explicit return types, causing type inference to widen unexpectedly.

**Why it happens:** TypeScript infers return types, but inference may be wider than intended:

```typescript
// Before: Inline in wrapper, types explicit
function createContainer<...>(...): Container<...> { ... }

// After: Shared function, types inferred
function createWrapper(impl, exposedMethods) {  // Return type: ???
  return Object.freeze({ ...exposedMethods });
}
```

**Prevention:**

1. **Explicit return types on extracted functions:** Per CLAUDE.md requirement
2. **Generic constraints preserve narrowness:**
   ```typescript
   function createWrapper<T extends ContainerMembers<...>>(impl, ...): T { ... }
   ```
3. **Type test for wrapper return types:** Verify Container type preserved

**Phase:** Address in Phase 7 (Extract Shared Wrapper Logic)

---

## Integration Pitfalls

### Pitfall 10: React Integration Breaking with Type Changes

**What goes wrong:** Changes to Container/Scope types break `@hex-di/react` hooks due to type incompatibility.

**Why it happens:** React package depends on runtime package types:

- `useContainer()` returns `Container<...>`
- `useScope()` returns `Scope<...>`
- Type parameter changes propagate to React

If Container type signature changes:

```typescript
// Before
type Container<TProvides, TExtends, TAsyncPorts, TPhase>

// After (hypothetical parameter reorder)
type Container<TProvides, TPhase, TExtends, TAsyncPorts>
```

All React hooks break without code changes.

**Warning signs:**

- React package typecheck fails after runtime changes
- Hook return types show wrong generic parameters
- `@hex-di/react` tests fail with type errors

**Prevention:**

1. **Type stability audit:** Document which type parameters are public API
2. **Cross-package type tests:** Test React hooks after runtime type changes
3. **Re-export preservation:** Keep same export signature even if internals change
4. **Workspace-wide typecheck:** Run `pnpm -r typecheck` before commit

**Phase:** Verify after all type changes (all phases)

**References:**

- `/packages/react/src/index.ts` - React exports depending on runtime types
- `/packages/react/tests/types.test-d.ts` - React type tests

---

### Pitfall 11: Testing Package Mock Adapter Drift

**What goes wrong:** `@hex-di/testing` mock adapter creation doesn't keep up with runtime changes, causing test utilities to produce invalid mocks.

**Why it happens:** Mock adapter has simplified type constraints:

```typescript
// Testing package - simplified
function createMockAdapter<P extends Port<unknown, string>>(port: P, mock: InferService<P>): ...

// Runtime package - full constraints
type RuntimeAdapter = Adapter<P, Deps, Lifetime, FactoryKind, HasFinalizer>
```

If runtime adds new required adapter fields, mocks missing them cause runtime errors.

**Warning signs:**

- Tests pass in isolation but fail in integration
- Mock adapters missing new required properties
- Type errors when using mock with real container

**Prevention:**

1. **Shared adapter type:** Import RuntimeAdapter type in testing package
2. **Mock adapter validation:** Runtime check mock shape matches real adapter
3. **Integration tests:** Test mock adapters with real containers

**Phase:** Verify after runtime adapter type changes

**References:**

- `/packages/testing/src/mock-adapter.ts` - Mock adapter implementation
- `/packages/runtime/src/container/internal-types.ts` - RuntimeAdapter type

---

## Phase-Specific Warnings

| Phase | Description            | Likely Pitfall                                                   | Mitigation                              |
| ----- | ---------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| 1     | Type File Split        | Circular imports (Pitfall 1)                                     | Topological ordering, type-only imports |
| 2     | Export Consolidation   | Breaking subpath exports (Pitfall 2)                             | Grep workspace first, preserve exports  |
| 3     | Type-Safe Override API | Inference regression (Pitfall 3), Builder complexity (Pitfall 6) | Type tests first, builder limits        |
| 4     | O(1) Child Operations  | Memory/GC regression (Pitfall 4)                                 | Use Set, benchmark before/after         |
| 5-6   | Hook/Plugin Tests      | Implementation coupling (Pitfall 5)                              | Behavior-based tests, public API only   |
| 7     | Shared Wrapper Logic   | Missing return types (Pitfall 9)                                 | Explicit types, type tests              |
| All   | -                      | React integration break (Pitfall 10)                             | Workspace-wide typecheck                |

---

## Testing Each Pitfall

| Pitfall              | Test Type           | Test Location                                       |
| -------------------- | ------------------- | --------------------------------------------------- |
| Circular imports     | Build + runtime     | `npm pack && npm install` in test project           |
| Export breakage      | Workspace typecheck | `pnpm -r typecheck`                                 |
| Override inference   | Type-level          | `packages/runtime/tests/override.test-d.ts`         |
| Map performance      | Benchmark           | `packages/runtime/tests/performance.bench.ts`       |
| Test brittleness     | Refactoring         | Rename internal method, run tests                   |
| Builder complexity   | Type-level          | `packages/runtime/tests/override-builder.test-d.ts` |
| File naming          | Manual review       | Checklist                                           |
| Stale snapshots      | Integration         | DevTools manual test                                |
| Missing return types | Type-level          | `packages/runtime/tests/wrapper.test-d.ts`          |
| React integration    | Cross-package       | `pnpm -r typecheck`                                 |
| Mock adapter drift   | Integration         | `packages/testing/tests/integration.test.ts`        |

---

## Warning Signs by Phase

**Planning Phase:**

- [ ] No circular import analysis for type split
- [ ] No export inventory before consolidation
- [ ] No type tests planned for override API
- [ ] No performance baseline for child container ops

**Implementation Phase:**

- [ ] `madge --circular` shows cycles after split
- [ ] Other packages fail typecheck after export changes
- [ ] Override return type shows `unknown`
- [ ] Tests spy on internal methods

**Testing Phase:**

- [ ] Tests break when renaming internals
- [ ] Benchmark shows performance regression
- [ ] Type tests fail with TS2589

**Integration Phase:**

- [ ] React package fails typecheck
- [ ] Testing package mocks invalid
- [ ] DevTools shows stale data

---

## Sources

**HIGH Confidence:**

- `/packages/runtime/src/types.ts` (1,271 lines) - Monolithic file to split
- `/packages/runtime/src/index.ts` (180 lines) - Current export structure
- `/packages/runtime/src/container/internal/lifecycle-manager.ts` - Child container tracking
- `/packages/runtime/src/container/override-context.ts` - Current override implementation
- `/packages/runtime/tests/override.test.ts` - Override test patterns

**MEDIUM Confidence:**

- TypeScript circular import behavior (well-documented)
- Map vs Set performance characteristics (documented in MDN)
- Builder pattern type accumulation (observed in GraphBuilder)

**LOW Confidence:**

- Specific performance regression magnitude (requires benchmarking)
- Exact recursion depth limits for override builder (requires testing)
- DevTools integration impact (requires manual testing)

---

_Research completed: 2026-02-03_
_Confidence: HIGH for pitfalls derived from codebase analysis, MEDIUM for performance predictions_
_Gaps: Need actual benchmarks for Map vs Array performance, need to test override builder depth limits_
