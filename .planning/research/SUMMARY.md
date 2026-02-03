# Project Research Summary

**Project:** HexDI v5.0 Runtime Package Improvements
**Domain:** TypeScript DI Container Internal Refactoring
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

The @hex-di/runtime package is a well-architected TypeScript dependency injection container currently rated at 8.7/10. The 20 identified improvements span type safety enhancements, performance optimizations, testing coverage, and developer experience. Research confirms that all improvements are additive or refactoring-focused with minimal architectural risk. The existing hexagonal architecture is sound and should be preserved.

The recommended approach follows a "types first, then internals" strategy. The monolithic 1,271-line types.ts file must be split before other type-related work can proceed safely. Performance optimizations (O(1) child container operations, timestamp elision) are low-risk and can proceed in parallel. The type-safe override API requires careful design to avoid TypeScript's recursion depth limits while maintaining inference quality.

Key risks center on circular import cycles during type file splitting (Critical), export breakage during consolidation (Critical), and type inference regression with the new override builder API (Moderate). All risks have documented prevention strategies and detection methods. The research indicates this refactoring can reach 9.5/10 quality with 8-10 days of focused implementation.

## Key Findings

### Recommended Stack/Patterns

The project uses established TypeScript DI patterns that are well-understood. No new technologies are needed.

**Core patterns:**

- **Mapped Types for Override API:** Use `{ [K in PortNames]?: () => ServiceType<K> }` for compile-time key validation without runtime overhead
- **Map with String Keys for O(1) Child Operations:** Replace Array.indexOf/splice with Map.set/delete while preserving LIFO disposal order
- **Type-Only Imports Between Split Files:** Use `import type` exclusively to prevent circular import runtime errors
- **Conditional Timestamp Capture:** Make Date.now() calls configurable via options for production performance

**Version constraints:**

- TypeScript 5.x required for stable mapped type behavior
- ES2015+ Map iteration order guarantees required for disposal semantics

### Expected Features

**Must have (table stakes):**

- Type-safe override API validating port names at compile time
- Actionable error messages with fix suggestions and code examples
- Single merged options object for createContainer()
- Plugin system testing patterns documented

**Should have (differentiators):**

- Override return type inference (factory return matches port service type)
- Error messages with copy-paste-ready code snippets (Rust-quality DX)
- Hook composition order documentation (beforeResolve in order, afterResolve reversed)
- Override scope isolation (instances don't pollute parent container)

**Defer (already implemented or documentation-only):**

- Hook composition itself (already works correctly)
- Global override registry (anti-feature - use scoped withOverrides)
- Async override factories (anti-feature - complicates API)
- Multiple options signatures (anti-feature - use single object)

### Architecture Approach

The existing hexagonal architecture with clear separation between Types Layer, Container Layer, Implementation Layer, Resolution Layer, and Inspection Layer should be preserved. Improvements integrate at well-defined points without architectural changes.

**Major components affected:**

1. **Types Layer** (`types.ts` -> `types/*.ts`) - Split into 6 focused files with barrel re-export for backward compatibility
2. **Container Layer** (`wrapper-utils.ts` new) - Extract ~200 lines of duplicated code from factory.ts and wrappers.ts
3. **Implementation Layer** (`lifecycle-manager.ts`) - Data structure change from Array to Map for child tracking
4. **Resolution Layer** (unchanged) - Core resolution engine not affected
5. **Inspection Layer** (`inspection/index.ts`) - Consolidate duplicate exports

**Integration approach:**

- wrapper-utils.ts imported by both factory.ts and wrappers.ts
- override-builder.ts provides new withOverrides implementation alongside existing string-based API
- types/index.ts re-exports preserve all existing import paths

### Critical Pitfalls

1. **Circular Import Cycles When Splitting types.ts** - Use topological ordering (brands -> options -> inheritance -> container -> scope -> utilities), type-only imports, and madge --circular verification. Test with `npm pack && npm install` in external project.

2. **Export Breakage During Consolidation** - Grep all workspace packages before removing exports. Preserve subpath exports in package.json. Run `pnpm -r typecheck` after changes to catch downstream breaks.

3. **Type Inference Regression with Override API** - Write .test-d.ts files BEFORE implementation. Provide builder pattern alongside string-keyed API for backward compatibility. Validate with expectTypeOf for override return types.

4. **Performance Regression with Map-Based Child Tracking** - Use Map (not WeakMap which doesn't iterate), benchmark before/after with 1000 child container operations, preserve LIFO disposal order via separate order array.

5. **Test Brittleness from Implementation Coupling** - Test observable behavior, not internal method calls. Avoid vi.spyOn on internal methods. Use public API surface only.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Types + Extraction)

**Rationale:** Type file split must happen first - it unblocks type-safe override API and reduces cognitive load for all subsequent work
**Delivers:** Split types.ts into 6 files, extracted wrapper-utils.ts, consolidated exports
**Addresses:** Improvements 3.1 (wrapper extraction), 3.4 (split types.ts), 3.5 (consolidate exports), 4.2 (legacy removal)
**Avoids:** Circular imports (Pitfall 1), Export breakage (Pitfall 2)
**Risk:** LOW - No functional changes, only code organization
**Research needed:** No - Standard TypeScript module patterns

### Phase 2: Performance (Data Structures)

**Rationale:** Independent of type changes, can proceed in parallel if needed. Low-risk performance wins.
**Delivers:** O(1) child container unregistration, configurable timestamps
**Addresses:** Improvements 4.1 (O(1) child ops), 4.5 (timestamp elision)
**Avoids:** Performance regression (Pitfall 4)
**Risk:** LOW - ~30 lines changed, well-isolated
**Research needed:** No - MDN-documented Map/Set semantics

### Phase 3: Type Safety (Override API + Options)

**Rationale:** Requires completed type split from Phase 1. Highest-value developer experience improvement.
**Delivers:** Type-safe withOverrides with builder pattern, merged createContainer options
**Addresses:** Improvements 3.2 (type-safe overrides), 4.7 (options API merge)
**Avoids:** Type inference regression (Pitfall 3), Builder complexity (Pitfall 6)
**Risk:** MEDIUM - Type-level complexity requires careful testing
**Research needed:** MAYBE - May need to validate builder depth limits with real usage patterns

### Phase 4: Testing (Hook + Plugin Coverage)

**Rationale:** Adds test coverage without changing production code. Can catch regressions from previous phases.
**Delivers:** 30-45 new tests for hooks and plugins
**Addresses:** Improvements 3.3 (hook tests), 4.3 (plugin tests)
**Avoids:** Test brittleness (Pitfall 5)
**Risk:** LOW - Test-only changes
**Research needed:** No - Existing test patterns in codebase

### Phase 5: Polish (Errors + Docs)

**Rationale:** DX improvements that don't affect functionality. Good final phase for quality uplift.
**Delivers:** Enhanced error messages with suggestions, architecture documentation
**Addresses:** Improvements 4.4 (error context), 4.6 (architecture docs)
**Risk:** LOW - Additive changes
**Research needed:** No - Error patterns well-documented

### Phase Ordering Rationale

- **Types first:** The 1,271-line types.ts creates cognitive overload and blocks type-safe override work. Splitting it is prerequisite for clean override API implementation.
- **Performance parallel-safe:** Data structure changes in lifecycle-manager.ts are isolated and can proceed independently, but grouping after types keeps review focused.
- **Builder after types:** The override builder needs clean type imports and benefits from reduced types.ts complexity.
- **Tests after changes:** Writing tests after production changes ensures they test actual behavior, not assumed implementation.
- **Docs last:** Documentation should reflect final state, not intermediate.

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 3 (Type Safety):** Builder pattern depth limits need validation. May need to test with 10-20 chained overrides to verify TypeScript doesn't hit TS2589 recursion error.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Foundation):** Well-documented TypeScript module splitting patterns
- **Phase 2 (Performance):** MDN-documented Map/Set operations
- **Phase 4 (Testing):** Existing test patterns in codebase provide templates
- **Phase 5 (Polish):** Error enhancement is additive, architecture docs are descriptive

## Confidence Assessment

| Area           | Confidence                               | Notes                                                                         |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Stack/Patterns | HIGH                                     | Direct codebase analysis, TypeScript handbook patterns                        |
| Features       | HIGH                                     | Existing implementation analyzed, industry patterns verified                  |
| Architecture   | HIGH                                     | Line-level code references, clear module boundaries                           |
| Pitfalls       | HIGH for detection, MEDIUM for magnitude | Pitfalls derived from code analysis; performance impact requires benchmarking |

**Overall confidence:** HIGH

### Gaps to Address

- **Performance regression magnitude:** Need actual benchmarks comparing Array vs Map for child container operations. Research provides O-notation analysis but not absolute numbers.
- **Builder recursion depth limits:** TypeScript's exact recursion limit depends on version and type complexity. Need to test with realistic override counts (10-20) during Phase 3 implementation.
- **DevTools integration impact:** Snapshot interface changes could affect visualization package. Manual testing needed after Phase 1 type changes.

## Sources

### Primary (HIGH confidence)

- `/packages/runtime/src/types.ts` (1,271 lines) - Direct analysis of monolithic file structure
- `/packages/runtime/src/container/factory.ts` (804 lines) - Wrapper duplication identified
- `/packages/runtime/src/container/wrappers.ts` (565 lines) - Wrapper duplication identified
- `/packages/runtime/src/container/internal/lifecycle-manager.ts` - O(n) child operations located
- `/packages/runtime/src/index.ts` (180 lines) - Current export structure mapped
- TypeScript Handbook - Mapped types, conditional types, module resolution

### Secondary (MEDIUM confidence)

- InversifyJS/TSyringe documentation - Override pattern comparison
- V8 engine documentation - Map/Set performance characteristics
- MDN Web Docs - ES2015 Map iteration order guarantees

### Tertiary (LOW confidence)

- Performance regression magnitude - Requires benchmarking to validate
- TypeScript recursion depth limits - Version-dependent, needs testing

---

_Research completed: 2026-02-03_
_Synthesized from: STACK.md, FEATURES.md, RUNTIME-IMPROVEMENTS-ARCHITECTURE.md, PITFALLS.md_
_Ready for roadmap: yes_
