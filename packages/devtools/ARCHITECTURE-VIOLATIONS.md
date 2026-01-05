# DevTools Architecture Violations Report

> **Last Updated**: 2026-01-04 (Phase 5 complete - ALL PHASES DONE)
> **Target**: Consolidate to Flow-based context system
> **Status**: All tests passing

---

## Summary

| Severity | ID  | Issue                               | Status               |
| -------- | --- | ----------------------------------- | -------------------- |
| CRITICAL | C1  | Parallel Context Systems            | ✅ Removed           |
| CRITICAL | C2  | DevToolsStoreProvider SRP Violation | ✅ Fixed             |
| CRITICAL | C3  | Duplicate Hook Names                | ✅ Fixed             |
| HIGH     | H1  | Provider Nesting Confusion          | ✅ Resolved (via C1) |
| HIGH     | H2  | Plugin Naming Collision             | ✅ Fixed             |
| HIGH     | H3  | Over-engineered State Management    | ✅ Resolved (via C1) |
| MEDIUM   | M1  | Hook Naming Inconsistency           | ✅ FALSE POSITIVE    |
| MEDIUM   | M2  | Incomplete Migration                | ✅ Complete          |
| MEDIUM   | M3  | IoC Violation in Store              | ✅ FALSE POSITIVE    |
| LOW      | L1  | Export Naming Confusion             | ✅ Fixed             |

---

## CRITICAL Issues

### C1: Parallel Context Systems Without Clear Boundaries

**Status**: ✅ Removed (Phase 4 complete)

**Problem**: Three independent context systems ran simultaneously without clear architectural guidance:

| Context                  | Location                            | Purpose                  | Status     |
| ------------------------ | ----------------------------------- | ------------------------ | ---------- |
| `DevToolsContext`        | `react/context/devtools-context.ts` | FSM-based runtime (Flow) | ✅ Keep    |
| `DevToolsRuntimeContext` | `react/runtime-context.ts`          | Plugin-based runtime     | ❌ Deleted |
| `DevToolsStoreContext`   | `store/use-devtools-store.tsx`      | Zustand store facade     | ✅ Keep    |

**Impact** (now resolved):

- ~~Components mix and match contexts inconsistently~~
- ~~No clear guidance on which to use~~
- ~~Increased cognitive load for developers~~

**Solution Applied**: Removed plugin-based context system entirely, kept Flow-based as primary.

**Files Deleted**:

- `src/react/runtime-context.ts` - ❌ Deleted
- `src/react/runtime-provider.tsx` - ❌ Deleted
- `src/react/hooks/use-plugin-runtime.ts` - ❌ Deleted
- `tests/plugin-architecture-integration.test.tsx` - ❌ Deleted

**Exports Removed**:

- `DevToolsRuntimeProvider` - removed from `react/index.ts`
- `DevToolsRuntimeContext` - removed from `react/index.ts`
- `usePluginRuntime`, `usePluginState`, `usePluginSelector` - removed from `hooks/index.ts`

**DevToolsPanel Changes**:

- Removed deprecated `runtime` prop
- Removed `DevToolsRuntimeProvider` wrapper in legacy mode
- Now uses only `DevToolsStoreProvider`

---

### C2: DevToolsStoreProvider Violates Single Responsibility

**Status**: ✅ Fixed (Phase 3 complete)

**Problem** (now resolved): In `src/store/use-devtools-store.tsx`, provider was providing THREE contexts:

```typescript
// OLD - Three contexts provided
return (
  <DevToolsStoreContext.Provider value={storeRef.current}>
    <DevToolsPluginsContext.Provider value={pluginsToUse}>
      <DevToolsContext.Provider value={fsmRuntime}>{children}</DevToolsContext.Provider>
    </DevToolsPluginsContext.Provider>
  </DevToolsStoreContext.Provider>
);
```

**Solution Applied**: Removed `DevToolsContext` from `DevToolsStoreProvider`. Now only TWO contexts:

```typescript
// NEW - Only two related contexts
return (
  <DevToolsStoreContext.Provider value={storeRef.current}>
    <DevToolsPluginsContext.Provider value={pluginsToUse}>
      {children}
    </DevToolsPluginsContext.Provider>
  </DevToolsStoreContext.Provider>
);
```

**Migration**:

- Created `useRuntimeFromStoreContext()` internal hook to get runtime from store
- Migrated `useDevToolsSnapshot()`, `useDevToolsSelector()`, `useDevToolsDispatch()` to use store context
- Created `useDevToolsFlowRuntimeOptional()` for hooks that need null-safe runtime access
- Added backward compatibility fallback to `DevToolsContext` for legacy `DevToolsProvider` users

**Files**:

- `src/store/use-devtools-store.tsx` - ✅ Removed DevToolsContext provision
- `src/store/index.ts` - ✅ Exported new hooks
- `src/react/hooks/use-devtools-runtime.ts` - ✅ Uses store context
- `src/react/hooks/use-devtools-selector.ts` - ✅ Uses store context
- `src/react/hooks/use-devtools-dispatch.ts` - ✅ Uses store context
- `src/react/hooks/use-container-scope-tree.ts` - ✅ Uses store context
- `src/react/providers/devtools-provider.tsx` - ✅ Marked deprecated

---

### C3: Duplicate Hook Names with Different Behaviors

**Status**: ✅ Fixed

**Problem**: Two `useDevToolsRuntime()` hooks existed:

1. **Flow-based** (`react/hooks/use-devtools-runtime.ts`):
   - Uses `DevToolsContext`
   - Returns `DevToolsSnapshot` via `useSyncExternalStore`

2. **Store-based** (`store/use-devtools-store.tsx:234`):
   - Uses `DevToolsStoreContext`
   - Returns `DevToolsFlowRuntime | null`

**Impact**: Same name, different return types, different contexts. Recipe for bugs.

**Solution**:

1. Renamed Flow-based hook to `useDevToolsSnapshot()` (clearer name for what it returns)
2. Renamed store-based hook to `useDevToolsFlowRuntime()` (indicates it returns the runtime)
3. Both old names kept as deprecated aliases for backward compatibility

**Files**:

- `src/react/hooks/use-devtools-runtime.ts` - ✅ Renamed to `useDevToolsSnapshot()`
- `src/store/use-devtools-store.tsx` - ✅ Renamed to `useDevToolsFlowRuntime()`
- `src/store/index.ts` - ✅ Updated exports
- `src/react/hooks/index.ts` - ✅ Updated exports
- `tests/react/unified-devtools-provider.test.tsx` - ✅ Updated error message
- `tests/architecture-integration.test.tsx` - ✅ Updated error message

---

## HIGH Issues

### H1: Provider Nesting Creates Confusion

**Status**: ✅ Resolved (via C1)

**Problem** (now resolved): Previously in `src/react/hex-di-devtools.tsx`:

```typescript
// OLD - Multiple nested providers
<DevToolsStoreProvider inspector={inspector}>
  <DevToolsRuntimeProvider runtime={pluginRuntime}>
    <DevToolsFloatingUI />
  </DevToolsRuntimeProvider>
</DevToolsStoreProvider>
```

**Solution Applied**: `DevToolsRuntimeProvider` was deleted as part of C1. Now there's only:

```typescript
// NEW - Single provider
<DevToolsStoreProvider inspector={inspector} plugins={pluginsToUse}>
  <DevToolsFloatingUI />
</DevToolsStoreProvider>
```

**Impact** (resolved):

- ~~Components can consume any of 3 contexts~~
- Now only 2 contexts (DevToolsStoreContext + DevToolsPluginsContext) in DevToolsStoreProvider
- DevToolsContext is only provided by legacy DevToolsProvider (deprecated)

---

### H2: Two Plugin Systems with Overlapping Names

**Status**: ✅ Fixed

**Problem**: Both runtime and devtools have plugins named `InspectorPlugin`:

| Package            | Plugin            | Purpose                 |
| ------------------ | ----------------- | ----------------------- |
| `@hex-di/runtime`  | `InspectorPlugin` | Runtime instrumentation |
| `@hex-di/devtools` | `InspectorPlugin` | UI tab for inspection   |

**Impact**: Naming collision caused confusion. Unclear which plugin was being referenced.

**Solution**:

1. Renamed DevTools plugin to `InspectorTabPlugin()`
2. Updated `presets.ts` to use new name internally
3. Kept `InspectorPlugin` as deprecated alias for backward compatibility

**Files**:

- `src/plugins/inspector-plugin.ts` - ✅ Renamed to `InspectorTabPlugin()`
- `src/plugins/index.ts` - ✅ Updated exports
- `src/plugins/presets.ts` - ✅ Uses `InspectorTabPlugin` internally

---

### H3: 3 State Management Patterns (Over-engineered)

**Status**: ✅ Resolved (via C1)

**Problem** (now resolved): Three different state patterns were active simultaneously:

1. **FSM-based** (`DevToolsFlowRuntime` with @hex-di/flow machines) - ✅ Kept
2. **Command-based** (`DevToolsRuntime` with dispatch/reducers) - ❌ Removed with C1
3. **Zustand store** (`DevToolsStore` as facade) - ✅ Kept

**Current Architecture**:

```
Container Inspector
    → FSM Machines (UIRunner, TracingRunner, ContainerTreeRunner)
    → Zustand Store (thin facade over FSM)
    → React Components
```

**Solution Applied**: Removed command-based `DevToolsRuntime` pattern as part of C1. Now only:

- FSM-based `DevToolsFlowRuntime` as source of truth
- Zustand store as thin React-friendly facade

---

## MEDIUM Issues

### M1: Hook Naming Inconsistency

**Status**: ✅ FALSE POSITIVE (Phase 5)

**Problem**: `useTraceStats(tracingAPI)` looks like a context hook but takes a prop parameter.

**Analysis**: After expert review, this is a valid React "subscriber hook" pattern:

- The hook uses `useState`, `useEffect`, and `useRef` internally
- It manages subscription lifecycle and returns reactive state
- Similar patterns exist in React Query (`useQuery(key)`) and SWR (`useSWR(key)`)

The `use*` prefix is appropriate for hooks that manage React state, regardless of whether they consume context.

**Verdict**: No action needed - the pattern is correct.

---

### M2: Incomplete Migration (Legacy Code)

**Status**: ✅ Complete

**Problem** (now resolved): Legacy plugin architecture was marked as "being phased out" but was still actively used.

**Solution Applied**: Migration completed as part of C1:

- `src/react/hooks/use-plugin-runtime.ts` - ❌ Deleted
- `src/react/runtime-context.ts` - ❌ Deleted
- `src/react/runtime-provider.tsx` - ❌ Deleted
- `tests/plugin-architecture-integration.test.tsx` - ❌ Deleted

Now only Flow-based system remains. No dual codepaths.

---

### M3: Store Creates Runtime Internally (IoC Violation)

**Status**: ✅ FALSE POSITIVE (Phase 5)

**Problem**: In `src/store/devtools-store.ts`:

```typescript
export function createDevToolsStoreWithRuntime(config: CreateDevToolsStoreConfig) {
  const runtime = new DevToolsFlowRuntime(config.inspector);
  // Store wraps runtime...
}
```

**Analysis**: After DI Container Architect review, this is **acceptable encapsulation**, not an IoC violation:

1. **True dependency IS injected**: The `inspector` (which comes from the DI container) is the real external dependency
2. **Runtime is implementation detail**: The store is a Facade pattern - runtime is an internal coordination mechanism
3. **Testing is not compromised**: Tests can:
   - Test the FSM runtime directly with real containers
   - Test hooks with mock runtimes implementing `DevToolsFlowRuntimeLike` interface
4. **Both patterns exist**: `DevToolsStoreProvider` creates internally, `DevToolsProvider` accepts externally

**Verdict**: No action needed - the Facade pattern is appropriate here.

---

## LOW Issues

### L1: Export Naming Confusion

**Status**: ✅ Fixed (Phase 5)

**Problem**: `src/index.ts` exports both store and runtime selectors with inconsistent prefixes:

- Store selectors: `storeSelectFirstSelectedId`, `storeSelectIsContainerExpanded`
- Runtime selectors: `selectPlugins`, `selectActivePlugin`

**Impact**: No clear API surface distinction.

**Solution Applied**: Added `runtime` prefix to all runtime selectors:

```typescript
// Now exported with consistent prefixes
runtimeSelectPlugins,
runtimeSelectActivePlugin,
runtimeSelectPluginById,
runtimeSelectTabList,
runtimeSelectSelectedContainers,
runtimeSelectIsContainerSelected,
runtimeSelectTracingState,
runtimeSelectIsTracingActive,
// Unprefixed names kept as deprecated aliases for backward compatibility
```

**Files**:

- `src/index.ts` ✅

---

## Resolution Strategy

### Phase 1: Document & Deprecate (Safe) ✅ COMPLETE

- [x] Write this violations report
- [x] Add `@deprecated` JSDoc to legacy code (C1)
- [x] Skip deprecated API tests with documentation
- [x] No breaking changes yet

### Phase 2: Rename Conflicts (Low Risk) ✅ COMPLETE

- [x] Rename duplicate `useDevToolsRuntime` → `useDevToolsFlowRuntime` (store-based)
- [x] Rename Flow-based `useDevToolsRuntime` → `useDevToolsSnapshot` (clearer name)
- [x] Both old names kept as deprecated aliases
- [x] Rename DevTools `InspectorPlugin` → `InspectorTabPlugin` (H2)

### Phase 3: Consolidate Contexts (Medium Risk) ✅ COMPLETE

- [x] Remove `DevToolsContext` provision from `DevToolsStoreProvider`
- [x] Create `useRuntimeFromStoreContext()` internal hook
- [x] Migrate hooks to use store context instead of `DevToolsContext`
- [x] Create `useDevToolsFlowRuntimeOptional()` for null-safe access
- [x] Add backward compatibility fallback to `DevToolsContext`
- [x] Keep `DevToolsProvider` for advanced users (deprecated)

### Phase 4: Remove Legacy (Higher Risk) ✅ COMPLETE

- [x] Remove deprecated plugin-based hooks (`usePluginRuntime`, `usePluginState`, `usePluginSelector`)
- [x] Remove `DevToolsRuntimeContext` and `DevToolsRuntimeProvider`
- [x] Remove `runtime` prop from DevToolsPanel
- [x] Delete `tests/plugin-architecture-integration.test.tsx`
- [x] Keep only Flow-based system

### Phase 5: Cleanup ✅ COMPLETE

- [x] Fix export naming consistency (L1) - Added `runtime` prefix to runtime selectors
- [x] Fix hook naming inconsistency (M1) - FALSE POSITIVE: Valid React pattern
- [x] Fix IoC violation in store (M3) - FALSE POSITIVE: Acceptable Facade pattern
- [x] Fix TypeScript violations:
  - [x] Removed eslint-disable comment in devtools-flow-runtime.ts
  - [x] Fixed hook type casts by typing `getSnapshot()` return properly
  - [x] Fixed CSSProperties casts with `satisfies` operator
  - [x] Fixed JSON.parse cast with type guard
- [x] Final test pass

---

## Verification

After each phase:

1. `pnpm --filter @hex-di/devtools test` - All tests pass
2. `pnpm --filter @hex-di/devtools build` - Build succeeds
3. `pnpm --filter react-showcase dev` - DevTools works correctly
