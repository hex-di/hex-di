# Spec Requirements: Inspector-Tracing Consolidation

## Initial Description

Child container discovery is broken in DevTools - only "App Root (root)" shows, but child containers (Chat Dashboard, grandchildren) are missing.

**Root Cause Found:**
`getEnhancedWrapper()` in `packages/runtime/src/plugin/wrapper.ts` (lines 372-375) only does a single WeakMap lookup. When multiple wrappers chain (withTracing + withInspector), the mapping is:

- `rawChild -> child1` (withTracing)
- `child1 -> child2` (withInspector)

Single lookup returns `child1` which has TRACING but NOT INSPECTOR, so `INSPECTOR in child1` fails.

**Expert Analysis (5 agents):**

1. Type System Architect: Inline methods simpler for types, but type extraction works
2. DI Container Architect: Keep plugin pattern, move into runtime package
3. Architecture Guardian: Current architecture is sound, preserve symbol-based access
4. Composition Test Architect: Composed components enable isolated testing
5. AI Optimization Architect: Grouped API better for discoverability

**Consensus (4-1):** Keep Inspector/Tracer as separate composed components, don't inline.

**Proposed Solution:**

1. Move `@hex-di/inspector` and `@hex-di/tracing` into `@hex-di/runtime/src/plugins/`
2. Fix `getEnhancedWrapper()` to follow the full wrapper chain
3. Preserve symbol-based access pattern
4. Export plugins from runtime package
5. Deprecate/remove separate inspector and tracing packages

## Requirements Discussion

### First Round Questions

**Q1:** I assume we want to move both `@hex-di/inspector` (~2076 lines across 9 files) and `@hex-di/tracing` (~583 lines across 4 files + collectors) into `@hex-di/runtime/src/plugins/` as internal modules. Is that correct, or should they remain as separate packages that get re-exported from runtime?
**Answer:** YES - Inspector and tracing are building blocks of the container. Move them into `@hex-di/runtime/src/plugins/` as internal modules.

**Q2:** I'm thinking the existing separate packages (`@hex-di/inspector`, `@hex-di/tracing`) should be deprecated with re-exports pointing to the runtime package for backward compatibility during a transition period. Should we instead remove them entirely in this change, or provide a deprecation path?
**Answer:** REMOVE the packages entirely. No backward compatibility - clean breaking changes.

**Q3:** The `getEnhancedWrapper()` fix requires following the full wrapper chain (multiple WeakMap lookups). I assume we want a simple iterative approach that follows the chain until we find a wrapper with the required symbol. Is that correct, or should we also restructure how wrapper tracking works to avoid the chain-following altogether?
**Answer:** The TypeScript Type System Architect found the REAL bug is NOT in `getEnhancedWrapper()`. The actual bug is in `trackAppliedWrapper()` - when using `pipe()` to apply multiple wrappers:

- Each wrapper creates a NEW enhanced object
- Each wrapper calls `trackAppliedWrapper` on its OWN enhanced object
- The final enhanced object only has ONE entry in `wrapperTrackingMap`

When a child is created:

1. `getAppliedWrappers(parent)` returns only 1 wrapper (the last one)
2. `applyParentWrappers` only applies 1 wrapper to the child
3. The child is missing plugins from earlier in the chain!

**FIX**: Modify `trackAppliedWrapper()` to INHERIT wrappers from input container:

```typescript
function trackAppliedWrapper(
  container: EnhanceableContainer,
  plugin: AnyPlugin,
  wrapper: PluginWrapperFn<symbol, unknown>,
  inheritedWrappers: readonly AppliedWrapper[] = []
): void {
  const newWrappers = [...inheritedWrappers, { plugin, wrapper }];
  wrapperTrackingMap.set(container, Object.freeze(newWrappers));
}
```

**Q4:** I assume we want to maintain the current symbol-based access pattern (`INSPECTOR in container`) for type narrowing and feature detection. Is that correct, or should we explore a different API pattern for accessing inspector/tracing capabilities?
**Answer:** The DI Container Architect recommends **Option B: Direct readonly properties**:

```typescript
interface Container<TAdapters extends AdapterTypeMap> {
  readonly inspector: InspectorAPI<TAdapters>;
  readonly tracer: TracerAPI;
}

// Usage
container.inspector.getSnapshot();
container.tracer.getTraces();
```

Rationale:

- "Core building blocks" mental model - properties ARE the building blocks
- Maximum discoverability (appears in IDE autocomplete immediately)
- Zero ceremony for consumers
- No feature detection needed - they're always there
- No symbol imports required

**Q5:** The expert consensus was 4-1 to keep Inspector/Tracer as separate composed components rather than inlining into container. I assume you agree with this recommendation to preserve modularity and testability. Is that correct?
**Answer:** YES - Confirmed. Keep Inspector/Tracer as separate composed components, not inline methods.

**Q6:** Should this consolidation also address any other related issues in the DevTools visualization (e.g., graph rendering, container state display), or should we strictly limit scope to fixing the child container discovery bug?
**Answer:** YES - Include related DevTools visualization issues (graph rendering, container state display).

**Q7:** Are there any aspects of inspector/tracing functionality (e.g., performance optimizations, new tracing features, DevTools UI changes) that should be deferred to future work?
**Answer:** Based on discovery findings, defer to future work:

- Performance optimizations
- New tracing features beyond current functionality
- Major DevTools UI redesign (beyond fixing discovery)

### Existing Code to Reference

**Similar Features Identified:**

- Feature: Recent plugin consolidation - Commit `74d0f88` removed old plugins pattern, migrated to wrapper-based composition
- Feature: Package removal precedent - `packages/devtools-testing/` was removed and consolidated
- Feature: WeakMap wrapper tracking - Path: `packages/runtime/src/plugin/wrapper.ts` (`originalToEnhancedMap` and `wrapperTrackingMap`)
- Feature: MemoMap parent chain traversal - Path: `memo-map.ts` (similar iterative lookup pattern)
- Feature: Symbol capability detection - Path: `type-guards.ts` (`INSPECTOR in container` pattern)

### Follow-up Questions

No follow-up questions needed - answers were comprehensive.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A

## Requirements Summary

### Functional Requirements

- Fix wrapper accumulation bug in `trackAppliedWrapper()` to inherit wrappers from input container
- Move `@hex-di/inspector` package (~2076 lines, 9 files) into `@hex-di/runtime/src/plugins/`
- Move `@hex-di/tracing` package (~583 lines, 4 files + collectors) into `@hex-di/runtime/src/plugins/`
- Remove `@hex-di/inspector` and `@hex-di/tracing` packages entirely (clean breaking change)
- Migrate API from symbol-based access to direct readonly properties on Container interface
- Expose `container.inspector` and `container.tracer` properties with full type inference
- Fix DevTools child container discovery to display full container hierarchy
- Address related DevTools visualization issues (graph rendering, container state display)

### Reusability Opportunities

- Commit `74d0f88` plugin consolidation pattern for migration approach
- `packages/devtools-testing/` removal as precedent for package deletion
- Existing `wrapperTrackingMap` and `originalToEnhancedMap` in `wrapper.ts` for understanding current implementation
- `memo-map.ts` iterative lookup pattern for reference

### Scope Boundaries

**In Scope:**

- Core bug fix: Modify `trackAppliedWrapper()` to accumulate wrappers from input container
- Package consolidation: Move inspector and tracing into `@hex-di/runtime/src/plugins/`
- Package removal: Delete `@hex-di/inspector` and `@hex-di/tracing` packages
- API migration: Symbols to direct readonly properties (`container.inspector`, `container.tracer`)
- DevTools child container discovery fix
- Related DevTools visualization fixes (graph rendering, container state display)
- Type definitions for new Container interface with inspector/tracer properties
- Export consolidated plugins from runtime package

**Out of Scope:**

- Performance optimizations for inspector/tracing
- New tracing features beyond current functionality
- Major DevTools UI redesign (beyond fixing discovery issues)
- Backward compatibility / deprecation path (clean break confirmed)
- Documentation updates (separate concern)

### Technical Considerations

- Breaking change: No backward compatibility path - clean package removal
- Type system: Container interface gains `readonly inspector: InspectorAPI<TAdapters>` and `readonly tracer: TracerAPI`
- Wrapper tracking: `trackAppliedWrapper()` must accept and accumulate inherited wrappers
- Package architecture: Inspector and tracing become internal modules of runtime package
- DevTools integration: Must work with new property-based API instead of symbol detection
- Testing: Existing tests in inspector/tracing packages must migrate to runtime package

### Key Files to Modify

- `packages/runtime/src/plugin/wrapper.ts` - Fix `trackAppliedWrapper()` accumulation bug
- `packages/runtime/src/types.ts` - Add inspector/tracer properties to Container interface
- `packages/runtime/src/index.ts` - Export consolidated plugin APIs
- `packages/inspector/` - Source for migration, then delete entire package
- `packages/tracing/` - Source for migration, then delete entire package
- `packages/devtools/` - Update to use new property-based API
