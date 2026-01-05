# Specification: Inspector-Tracing Consolidation

## Goal

Fix the child container discovery bug caused by wrapper accumulation not inheriting from input containers, then consolidate `@hex-di/inspector` and `@hex-di/tracing` packages into `@hex-di/runtime` with direct property-based API access (`container.inspector`, `container.tracer`).

## User Stories

- As a developer using DevTools, I want to see all child containers in the container hierarchy so that I can inspect and debug my entire DI graph
- As a developer using hex-di, I want direct property access to inspector and tracer APIs so that I can discover and use these features without importing symbols

## Specific Requirements

**Fix wrapper accumulation in trackAppliedWrapper()**

- Modify `trackAppliedWrapper()` in `packages/runtime/src/plugin/wrapper.ts` to inherit wrappers from input container
- When `pipe()` applies multiple wrappers, each enhanced object must accumulate ALL previous wrappers, not just track its own
- Pass inherited wrappers as parameter: `trackAppliedWrapper(enhanced, plugin, wrapper, inheritedWrappers)`
- Merge inherited wrappers with new wrapper: `const newWrappers = [...inheritedWrappers, { plugin, wrapper }]`
- This ensures `getAppliedWrappers(parent)` returns the full chain, enabling `applyParentWrappers()` to apply all plugins to children

**Move inspector package into runtime**

- Relocate all files from `packages/inspector/src/` to `packages/runtime/src/plugins/inspector/`
- Files to move: `helpers.ts`, `index.ts`, `inspector.ts`, `internal-helpers.ts`, `plugin.ts`, `symbols.ts`, `type-guards.ts`, `types.ts`, `wrapper.ts`
- Update internal import paths to use relative paths within runtime package
- Export public API from `packages/runtime/src/index.ts`

**Move tracing package into runtime**

- Relocate all files from `packages/tracing/src/` to `packages/runtime/src/plugins/tracing/`
- Files to move: `index.ts`, `plugin.ts`, `type-guards.ts`, `wrapper.ts`, `collectors/` directory
- Update internal import paths to use relative paths within runtime package
- Export public API from `packages/runtime/src/index.ts`

**Migrate API from symbols to direct properties**

- Add `readonly inspector: InspectorAPI` and `readonly tracer: TracerAPI` properties to Container interface in `types.ts`
- Create inspector and tracer instances during container creation in `factory.ts`
- Attach properties using `Object.defineProperty()` pattern used for plugin APIs
- Properties must be non-enumerable to maintain existing serialization behavior
- Inspector/tracer instances must be frozen for immutability

**Remove separate inspector and tracing packages**

- Delete `packages/inspector/` directory entirely after migration
- Delete `packages/tracing/` directory entirely after migration
- Remove package entries from root `pnpm-workspace.yaml` if present
- Update `pnpm-lock.yaml` to remove package references
- Clean breaking change - no backward compatibility or deprecation warnings

**Update DevTools to use new property-based API**

- Replace `container[INSPECTOR]` with `container.inspector` throughout `packages/devtools/`
- Replace `container[TRACING]` with `container.tracer` throughout `packages/devtools/`
- Remove symbol imports (`INSPECTOR`, `TRACING`) from DevTools components
- Update type guards to check for property existence instead of symbol presence

**Fix DevTools child container discovery**

- After wrapper accumulation fix, `getChildContainers()` will return properly enhanced child containers
- Verify DevTools displays full container hierarchy (root, children, grandchildren)
- Test with react-showcase example which demonstrates multi-level container hierarchy

**Migrate tests from inspector/tracing packages to runtime**

- Move test files from `packages/inspector/tests/` to `packages/runtime/tests/plugins/inspector/`
- Move test files from `packages/tracing/tests/` to `packages/runtime/tests/plugins/tracing/`
- Update import paths in migrated tests
- Ensure all existing test coverage is preserved

## Existing Code to Leverage

**Wrapper tracking in wrapper.ts**

- `wrapperTrackingMap` WeakMap at line 327 stores applied wrappers per container
- `trackAppliedWrapper()` at line 334-342 is the function to modify for accumulation fix
- `getAppliedWrappers()` at line 348-350 retrieves wrappers for child inheritance
- `applyParentWrappers()` at line 388-410 applies parent wrappers to children

**Plugin wrapper pattern in factory.ts**

- `createContainer()` returns base container that wrappers enhance
- `createUninitializedContainerWrapper()` creates the frozen container wrapper
- `HooksHolder` pattern at lines 53-78 shows late-binding composition approach
- `Object.defineProperty()` pattern used for adding properties to frozen objects

**InspectorPlugin implementation**

- `InspectorPlugin` in `packages/inspector/src/plugin.ts` provides complete implementation reference
- `createInspectorAPI()` internal function creates the API object
- WeakMap-based state management with `containerStates` and `containerRegistry`
- `getChildContainers()` implementation shows current discovery approach using `getEnhancedWrapper()`

**Commit 74d0f88 consolidation precedent**

- Shows pattern for removing old plugin code and migrating to wrapper pattern
- Updates across react-showcase, devtools, runtime packages
- Test migration approach for wrapper-based plugins

**Package removal precedent (devtools-testing)**

- `packages/devtools-testing/` removal in git status shows clean package deletion pattern
- Demonstrates removing package.json, tsconfig files, and source directories

## Out of Scope

- Performance optimizations for inspector/tracing beyond current functionality
- New tracing features or collector types
- Major DevTools UI redesign (only fixing discovery issues)
- Backward compatibility shims or deprecation warnings for old symbol API
- Documentation updates beyond inline code comments
- React hooks API changes (useDevtools, useContainerInspector remain unchanged)
- Changes to @hex-di/plugin package (types remain there)
- Changes to @hex-di/devtools-core package
- Changes to @hex-di/devtools-network package
- Lazy container inspector/tracer behavior changes
